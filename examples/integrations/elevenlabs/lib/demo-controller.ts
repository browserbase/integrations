import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { Browserbase } from "@browserbasehq/sdk";
import { z } from "zod";
import type { DemoControlInput, DemoControlOutcome, DemoEvent, DemoSessionSnapshot } from "./demo-types";

const execFileAsync = promisify(execFile);
const MAX_EVENT_COUNT = 40;
const MAX_STEP_COUNT = 8;
const MAX_SNAPSHOT_LINES = 140;
const MAX_LINK_TARGETS = 40;
const BROWSE_STDOUT_MAX_BUFFER = 32 * 1024 * 1024;
const BROWSE_COMMAND_TIMEOUT_MS = 30000;
const PLANNER_MODEL = "claude-opus-4-7";
const BROWSE_COMMAND = process.env.BROWSE_BIN ?? "browse";
const SIMILAR_INSTRUCTION_OVERLAP_THRESHOLD = 0.62;
const DIRECT_NAVIGATION_TARGETS = [
  {
    aliases: ["browserbase", "browser base", "browser-based", "browser based"],
    url: "https://www.browserbase.com/"
  },
  {
    aliases: ["elevenlabs", "eleven labs", "11labs", "11 labs"],
    url: "https://elevenlabs.io/"
  },
  {
    aliases: ["google news"],
    url: "https://news.google.com/home?hl=en-US&gl=US&ceid=US:en"
  }
];

const DIRECT_NAVIGATION_REJECT_TERMS = new Set([
  "article",
  "buy",
  "click",
  "compare",
  "create",
  "download",
  "edit",
  "fill",
  "find",
  "login",
  "read",
  "search",
  "sign",
  "summarize",
  "summary",
  "upload",
  "watch"
]);

const INSTRUCTION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "go",
  "i",
  "in",
  "into",
  "it",
  "me",
  "navigate",
  "of",
  "on",
  "open",
  "or",
  "out",
  "page",
  "please",
  "section",
  "see",
  "show",
  "site",
  "take",
  "tell",
  "that",
  "the",
  "their",
  "this",
  "to",
  "use",
  "using",
  "website",
  "what",
  "which",
  "who"
]);

const ORDINAL_WORDS = new Set([
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth"
]);

const INSTRUCTION_ALIASES = new Map([
  ["client", "customer"],
  ["clients", "customer"],
  ["customer", "customer"],
  ["customers", "customer"],
  ["user", "customer"],
  ["users", "customer"],
  ["study", "case-study"],
  ["studies", "case-study"]
]);

type BrowserPageSummary = {
  index: number;
  url: string;
  targetId: string;
};

type BrowserInspection = {
  title: string;
  url: string;
  tree: string;
  pageText: string;
  xpathMap: Record<string, string>;
  urlMap: Record<string, string>;
  pages: BrowserPageSummary[];
};

type BrowserAction =
  | { type: "goto"; url: string }
  | { type: "click"; ref: string }
  | { type: "type"; text: string }
  | { type: "press"; key: string }
  | { type: "back" }
  | { type: "answer"; answer: string; evidence?: string[] }
  | { type: "blocked"; reason: string; question?: string }
  | { type: "done"; summary: string };

type PlannerDecision = {
  action: BrowserAction;
  reason: string;
  spokenUpdate: string;
};

type RuntimeDemoSession = DemoSessionSnapshot & {
  abortController: AbortController | null;
  activeRun: Promise<void> | null;
  browserbaseClient: Browserbase | null;
  browseSessionName: string;
  lastPageTargetIds: string[];
  lastBrowseError: string | null;
  pendingQueue: DemoControlInput[];
  mutationLock: Promise<void>;
  lastInspection: BrowserInspection | null;
};

type DemoStore = Map<string, RuntimeDemoSession>;
type SessionSubscriber = (snapshot: DemoSessionSnapshot) => void;
type SessionSubscriberStore = Map<string, Set<SessionSubscriber>>;

const plannerDecisionSchema = z.object({
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("goto"), url: z.string().url() }),
    z.object({ type: z.literal("click"), ref: z.string().min(1) }),
    z.object({ type: z.literal("type"), text: z.string().min(1) }),
    z.object({ type: z.literal("press"), key: z.string().min(1) }),
    z.object({ type: z.literal("back") }),
    z.object({ type: z.literal("answer"), answer: z.string().min(1), evidence: z.array(z.string()).optional() }),
    z.object({ type: z.literal("blocked"), reason: z.string().min(1), question: z.string().optional() }),
    z.object({ type: z.literal("done"), summary: z.string().min(1) })
  ]),
  reason: z.string().min(1),
  spokenUpdate: z.string().min(1).max(160)
});

const globalStore = globalThis as typeof globalThis & {
  __browserVoiceDemoStore?: DemoStore;
  __browserVoiceDemoSubscribers?: SessionSubscriberStore;
};

function getStore(): DemoStore {
  if (!globalStore.__browserVoiceDemoStore) {
    globalStore.__browserVoiceDemoStore = new Map();
  }

  return globalStore.__browserVoiceDemoStore;
}

function getSubscriberStore(): SessionSubscriberStore {
  if (!globalStore.__browserVoiceDemoSubscribers) {
    globalStore.__browserVoiceDemoSubscribers = new Map();
  }

  return globalStore.__browserVoiceDemoSubscribers;
}

function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY ?? process.env.anthropic_key ?? null;
}

function getBrowserbaseApiKey() {
  return process.env.BROWSERBASE_API_KEY ?? process.env.browserbase_key ?? null;
}

function getBrowserbaseProjectId() {
  return process.env.BROWSERBASE_PROJECT_ID ?? process.env.browserbase_project_id ?? null;
}

function getMissingConfig(): string[] {
  const missing: string[] = [];

  if (!getAnthropicApiKey()) {
    missing.push("ANTHROPIC_API_KEY");
  }

  if (!getBrowserbaseApiKey()) {
    missing.push("BROWSERBASE_API_KEY");
  }

  if (!getBrowserbaseProjectId()) {
    missing.push("BROWSERBASE_PROJECT_ID");
  }

  return missing;
}

function getBrowseSessionName(demoId: string) {
  const slug = demoId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 24);
  return `demo-${slug || "default"}`;
}

function createSession(demoId: string): RuntimeDemoSession {
  return {
    demoId,
    activeRunId: null,
    status: "idle",
    busy: false,
    liveViewUrl: null,
    browserbaseSessionId: null,
    claudeSessionId: null,
    currentUrl: null,
    pageTitle: null,
    lastInstruction: null,
    lastSummary: null,
    currentStep: null,
    lastNarration: null,
    lastControlOutcome: null,
    lastControlMessage: null,
    queuedInstructionCount: 0,
    queuedInstructions: [],
    stepCount: 0,
    error: null,
    missingConfig: getMissingConfig(),
    events: [],
    abortController: null,
    activeRun: null,
    browserbaseClient: null,
    browseSessionName: getBrowseSessionName(demoId),
    lastPageTargetIds: [],
    lastBrowseError: null,
    pendingQueue: [],
    mutationLock: Promise.resolve(),
    lastInspection: null
  };
}

function getOrCreateSession(demoId: string): RuntimeDemoSession {
  const store = getStore();
  const existing = store.get(demoId);
  if (existing) {
    existing.missingConfig = getMissingConfig();
    return existing;
  }

  const created = createSession(demoId);
  store.set(demoId, created);
  return created;
}

function toSnapshot(session: RuntimeDemoSession): DemoSessionSnapshot {
  return {
    demoId: session.demoId,
    activeRunId: session.activeRunId,
    status: session.status,
    busy: session.busy,
    liveViewUrl: session.liveViewUrl,
    browserbaseSessionId: session.browserbaseSessionId,
    claudeSessionId: session.claudeSessionId,
    currentUrl: session.currentUrl,
    pageTitle: session.pageTitle,
    lastInstruction: session.lastInstruction,
    lastSummary: session.lastSummary,
    currentStep: session.currentStep,
    lastNarration: session.lastNarration,
    lastControlOutcome: session.lastControlOutcome,
    lastControlMessage: session.lastControlMessage,
    queuedInstructionCount: session.pendingQueue.length,
    queuedInstructions: session.pendingQueue.map((input) => input.instruction),
    stepCount: session.stepCount,
    error: session.error,
    missingConfig: session.missingConfig,
    events: session.events.slice(-MAX_EVENT_COUNT)
  };
}

function publishSession(session: RuntimeDemoSession) {
  const subscribers = getSubscriberStore().get(session.demoId);
  if (!subscribers || !subscribers.size) {
    return;
  }

  const snapshot = toSnapshot(session);
  for (const subscriber of subscribers) {
    subscriber(snapshot);
  }
}

function pushEvent(
  session: RuntimeDemoSession,
  kind: DemoEvent["kind"],
  message: string,
  options: {
    runId?: string | null;
    speakable?: string | null;
    step?: number | null;
  } = {}
) {
  session.events.push({
    id: crypto.randomUUID(),
    kind,
    message,
    createdAt: new Date().toISOString(),
    runId: options.runId ?? null,
    speakable: options.speakable ?? null,
    step: options.step ?? null
  });

  if (session.events.length > MAX_EVENT_COUNT * 3) {
    session.events.splice(0, session.events.length - MAX_EVENT_COUNT * 2);
  }
}

function setControlOutcome(session: RuntimeDemoSession, outcome: DemoControlOutcome, message: string) {
  session.lastControlOutcome = outcome;
  session.lastControlMessage = message;
}

async function syncPageState(
  session: RuntimeDemoSession,
  pageState?: {
    title?: string | null;
    url?: string | null;
  }
) {
  if (pageState) {
    session.pageTitle = pageState.title ?? session.pageTitle;
    session.currentUrl = pageState.url ?? session.currentUrl;
    return;
  }

  if (!session.browserbaseClient || !session.browserbaseSessionId) {
    return;
  }

  try {
    const activeState = await getActivePageState(session);
    session.currentUrl = activeState.url ?? session.currentUrl;
    session.pageTitle = activeState.title ?? session.pageTitle;
  } catch {
    if (session.currentUrl && session.currentUrl !== "about:blank") {
      return;
    }

    try {
      const liveState = await session.browserbaseClient.sessions.debug(session.browserbaseSessionId);
      const activePage = liveState.pages[0];
      session.currentUrl = activePage?.url ?? session.currentUrl;
      session.pageTitle = activePage?.title ?? session.pageTitle;
    } catch {
      // Preserve the last known state if Browserbase or Browse CLI state is temporarily unavailable.
    }
  }
}

async function ensureBrowserRuntime(session: RuntimeDemoSession) {
  if (session.browserbaseSessionId) {
    return;
  }

  const browserbaseApiKey = getBrowserbaseApiKey();
  const browserbaseProjectId = getBrowserbaseProjectId();

  if (!browserbaseApiKey || !browserbaseProjectId) {
    throw new Error("Browserbase credentials are missing.");
  }

  session.status = "starting";
  session.currentStep = "Starting Browserbase session.";
  pushEvent(session, "system", "Starting Browserbase session.");
  publishSession(session);

  const browserbase = new Browserbase({ apiKey: browserbaseApiKey });
  const browserSession = await browserbase.sessions.create({
    projectId: browserbaseProjectId,
    keepAlive: true
  });
  const debugConnection = await browserbase.sessions.debug(browserSession.id);

  session.browserbaseClient = browserbase;
  session.browserbaseSessionId = browserSession.id;
  session.liveViewUrl = `${debugConnection.debuggerFullscreenUrl}&navbar=false`;

  await ensureBrowseRemoteMode(session);
  pushEvent(session, "system", "Browserbase live view is ready.");
  pushEvent(session, "system", `Browse CLI is attached to Browserbase session ${browserSession.id}.`);
  publishSession(session);
}

function getSessionId(message: unknown): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const typedMessage = message as { session_id?: string };
  return typedMessage.session_id ?? null;
}

function getAssistantText(message: unknown): string | null {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return null;
  }

  const typedMessage = message as {
    type?: string;
    message?: {
      content?: Array<{ type?: string; text?: string }>;
    };
  };

  if (typedMessage.type !== "assistant") {
    return null;
  }

  const blocks = typedMessage.message?.content ?? [];
  const text = blocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || null;
}

function getResultText(message: unknown): string | null {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return null;
  }

  const typedMessage = message as {
    type?: string;
    result?: string;
  };

  if (typedMessage.type !== "result") {
    return null;
  }

  return typedMessage.result?.trim() || null;
}

function extractJsonBlock(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Planner response did not contain JSON: ${text}`);
  }

  return text.slice(start, end + 1);
}

function normalizeStringRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [key, String(entryValue ?? "")])
  );
}

function normalizePages(value: unknown): BrowserPageSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const page = entry as Record<string, unknown>;
      if (typeof page.index !== "number" || typeof page.url !== "string" || typeof page.targetId !== "string") {
        return null;
      }

      return {
        index: page.index,
        url: page.url,
        targetId: page.targetId
      };
    })
    .filter((page): page is BrowserPageSummary => page !== null);
}

async function runBrowseCommand(
  session: RuntimeDemoSession,
  command: string,
  args: string[] = [],
  options: {
    connect?: boolean;
    signal?: AbortSignal;
  } = {}
) {
  if (!session.browserbaseSessionId && options.connect !== false) {
    throw new Error("Browser session is not ready.");
  }

  const browseArgs = ["--json", "--session", session.browseSessionName];
  if (options.connect !== false && session.browserbaseSessionId) {
    browseArgs.push("--connect", session.browserbaseSessionId);
  }

  browseArgs.push(command, ...args);

  try {
    const { stdout } = await execFileAsync(
      BROWSE_COMMAND,
      browseArgs,
      {
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: getAnthropicApiKey() ?? "",
          BROWSERBASE_API_KEY: getBrowserbaseApiKey() ?? "",
          BROWSERBASE_PROJECT_ID: getBrowserbaseProjectId() ?? ""
        },
        maxBuffer: BROWSE_STDOUT_MAX_BUFFER,
        timeout: BROWSE_COMMAND_TIMEOUT_MS,
        signal: options.signal
      }
    );

    session.lastBrowseError = null;
    try {
      return JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Unknown JSON parse error.";
      session.lastBrowseError = `Browse CLI ${command} returned malformed JSON: ${message}`;
      throw new Error(session.lastBrowseError);
    }
  } catch (error) {
    const executionError = error as Error & {
      code?: string;
      stdout?: string;
      stderr?: string;
    };

    if (
      executionError.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ||
      executionError.message.includes("maxBuffer")
    ) {
      session.lastBrowseError =
        `Browse CLI ${command} output exceeded ${Math.round(BROWSE_STDOUT_MAX_BUFFER / 1024 / 1024)} MB.`;
      throw new Error(session.lastBrowseError);
    }

    if (executionError.code === "ETIMEDOUT" || executionError.message.includes("timed out")) {
      session.lastBrowseError = `Browse CLI ${command} timed out after ${BROWSE_COMMAND_TIMEOUT_MS / 1000}s.`;
      throw new Error(session.lastBrowseError);
    }

    if (executionError.code === "ENOENT") {
      session.lastBrowseError = "Browse CLI is not installed.";
      throw new Error("Browse CLI is not installed. Install it with `npm install -g @browserbasehq/browse-cli`.");
    }

    const rawOutput = executionError.stdout?.trim() || executionError.stderr?.trim();
    if (rawOutput) {
      let payload: Record<string, unknown> | null = null;
      try {
        payload = JSON.parse(rawOutput) as Record<string, unknown>;
      } catch {
        // Some Browse CLI failures include partial JSON on stdout. Prefer the process error below.
      }

      if (typeof payload?.error === "string") {
        session.lastBrowseError = payload.error;
        throw new Error(payload.error);
      }
    }

    session.lastBrowseError = executionError.message || `Browse CLI ${command} failed.`;
    throw new Error(executionError.message || `Browse CLI ${command} failed.`);
  }
}

async function ensureBrowseRemoteMode(session: RuntimeDemoSession) {
  try {
    await runBrowseCommand(session, "env", ["remote"], { connect: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to switch Browse CLI to remote mode.";
    throw new Error(message);
  }
}

async function listPages(session: RuntimeDemoSession, signal?: AbortSignal) {
  const payload = await runBrowseCommand(session, "pages", [], { signal });
  const pages = normalizePages(payload.pages);
  session.lastPageTargetIds = pages.map((page) => page.targetId);
  return pages;
}

function isInspectionEmpty(inspection: BrowserInspection) {
  return !inspection.tree.trim() && !inspection.pages.length && !Object.keys(inspection.urlMap).length;
}

async function resetBrowseDaemon(session: RuntimeDemoSession) {
  try {
    await runBrowseCommand(session, "stop", ["--force"], { connect: false });
  } catch {
    // Ignore daemon shutdown failures during recovery.
  }

  await ensureBrowseRemoteMode(session);
}

async function inspectBrowserOnce(session: RuntimeDemoSession, signal?: AbortSignal) {
  const snapshotPayload = await runBrowseCommand(session, "snapshot", [], { signal });
  const titlePayload = await runBrowseCommand(session, "get", ["title"], { signal });
  const urlPayload = await runBrowseCommand(session, "get", ["url"], { signal });
  const textPayload = await runBrowseCommand(session, "get", ["text", "body"], { signal }).catch(() => {
    signal?.throwIfAborted();
    return { text: "" };
  });
  const pages = await listPages(session, signal);

  return {
    title: String(titlePayload.title ?? ""),
    url: String(urlPayload.url ?? ""),
    tree: String(snapshotPayload.tree ?? ""),
    pageText: String(textPayload.text ?? "").replace(/\s+/g, " ").trim().slice(0, 4000),
    xpathMap: normalizeStringRecord(snapshotPayload.xpathMap),
    urlMap: normalizeStringRecord(snapshotPayload.urlMap),
    pages
  } satisfies BrowserInspection;
}

async function inspectBrowser(session: RuntimeDemoSession, signal?: AbortSignal) {
  try {
    let inspection = await inspectBrowserOnce(session, signal);

    if (isInspectionEmpty(inspection) && inspection.url && inspection.url !== "about:blank") {
      throw new Error("Browse snapshot returned no refs, pages, or tree content.");
    }

    session.lastInspection = inspection;
    await syncPageState(session, {
      title: inspection.title,
      url: inspection.url
    });
    return inspection;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    const firstError = error instanceof Error ? error.message : "Unknown browse snapshot failure.";

    pushEvent(session, "error", `Browse snapshot failed: ${firstError}`);

    try {
      await resetBrowseDaemon(session);
      const recoveredInspection = await inspectBrowserOnce(session, signal);

      if (isInspectionEmpty(recoveredInspection) && recoveredInspection.url && recoveredInspection.url !== "about:blank") {
        throw new Error("Browse snapshot remained empty after daemon restart.");
      }

      session.lastInspection = recoveredInspection;
      await syncPageState(session, {
        title: recoveredInspection.title,
        url: recoveredInspection.url
      });
      pushEvent(session, "system", "Recovered the Browse CLI session after a snapshot failure.");
      return recoveredInspection;
    } catch (recoveryError) {
      const recoveryMessage =
        recoveryError instanceof Error ? recoveryError.message : "Unknown browse recovery failure.";

      session.lastBrowseError = recoveryMessage;
      pushEvent(session, "error", `Browse snapshot recovery failed: ${recoveryMessage}`);
    }

    const [titleFallback, urlFallback] = await Promise.all([
      runBrowseCommand(session, "get", ["title"], { signal }),
      runBrowseCommand(session, "get", ["url"], { signal })
    ]);

    const inspection: BrowserInspection = {
      title: String(titleFallback.title ?? ""),
      url: String(urlFallback.url ?? ""),
      tree: "",
      pageText: "",
      xpathMap: {},
      urlMap: {},
      pages: []
    };

    session.lastInspection = inspection;
    await syncPageState(session, {
      title: inspection.title,
      url: inspection.url
    });
    return inspection;
  }
}

function formatRecentEvents(session: RuntimeDemoSession) {
  const recent = session.events.slice(-8);
  if (!recent.length) {
    return "- none";
  }

  return recent
    .map((event) => {
      const prefix = event.step ? `step ${event.step}` : event.kind;
      return `- ${prefix}: ${event.message}`;
    })
    .join("\n");
}

function formatOpenPages(inspection: BrowserInspection) {
  if (!inspection.pages.length) {
    return "- none";
  }

  return inspection.pages
    .slice(0, 8)
    .map((page) => `- [${page.index}] ${page.url}`)
    .join("\n");
}

function formatSnapshotTree(inspection: BrowserInspection) {
  const trimmed = inspection.tree.trim();
  if (!trimmed) {
    return "- none";
  }

  return trimmed
    .split("\n")
    .slice(0, MAX_SNAPSHOT_LINES)
    .join("\n");
}

function formatLinkTargets(inspection: BrowserInspection) {
  const entries = Object.entries(inspection.urlMap);
  if (!entries.length) {
    return "- none";
  }

  return entries
    .slice(0, MAX_LINK_TARGETS)
    .map(([ref, url]) => `- ${ref}: ${url}`)
    .join("\n");
}

function formatPageText(inspection: BrowserInspection) {
  return inspection.pageText || "none";
}

async function planNextStep(
  session: RuntimeDemoSession,
  instruction: string,
  inspection: BrowserInspection,
  abortController: AbortController
): Promise<PlannerDecision> {
  const systemPrompt = [
    "You are the single orchestrator for a live browser demo using Browserbase Browse CLI.",
    "Choose exactly one next browser step at a time.",
    "Available actions:",
    '- {"type":"goto","url":"https://..."}',
    '- {"type":"click","ref":"@0-5"}',
    '- {"type":"type","text":"..."}',
    '- {"type":"press","key":"Enter"}',
    '- {"type":"back"}',
    '- {"type":"answer","answer":"...","evidence":["..."]}',
    '- {"type":"blocked","reason":"...","question":"..."}',
    '- {"type":"done","summary":"..."}',
    "Rules:",
    "- Prefer direct navigation when the target page is obvious.",
    "- If the user asks for information that is already visible in the page text or snapshot, answer directly with evidence instead of browsing more.",
    "- If you cannot answer because the page does not expose enough information, return blocked with a specific clarification question.",
    "- The snapshot tree contains stable element refs like @0-5. Use those refs for click actions.",
    "- Never invent a ref that is not present in the snapshot tree.",
    "- Use click-by-ref instead of fuzzy text matching whenever the desired element is visible.",
    "- Use type only after the correct input is already focused, and use press when Enter or Tab is needed.",
    "- If a click failed recently, choose a different ref or a different strategy instead of repeating it.",
    "- Use done only when a browser task is complete. Use answer when the user asked a question and you can answer from observed page evidence.",
    "- Keep spokenUpdate short and natural. It is what the voice shell may say out loud.",
    "- Return valid JSON only and no markdown."
  ].join("\n");

  const prompt = [
    `User goal: ${instruction}`,
    `Current URL: ${inspection.url || "unknown"}`,
    `Current title: ${inspection.title || "unknown"}`,
    "Open pages:",
    formatOpenPages(inspection),
    "Snapshot tree:",
    formatSnapshotTree(inspection),
    `Page text excerpt: ${formatPageText(inspection)}`,
    "Visible link targets by ref:",
    formatLinkTargets(inspection),
    "Recent controller events:",
    formatRecentEvents(session),
    "Return JSON with shape:",
    '{"action": {...}, "reason": "why this step", "spokenUpdate": "short user-facing update"}'
  ].join("\n");

  let plannerText = "";

  for await (const message of query({
    prompt,
    options: {
      model: PLANNER_MODEL,
      permissionMode: "dontAsk",
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: getAnthropicApiKey() ?? ""
      },
      tools: [],
      allowedTools: [],
      systemPrompt,
      abortController
    }
  })) {
    abortController.signal.throwIfAborted();

    const sessionId = getSessionId(message);
    if (sessionId) {
      session.claudeSessionId = sessionId;
    }

    const assistantText = getAssistantText(message);
    if (assistantText) {
      plannerText = assistantText;
    }

    const resultText = getResultText(message);
    if (resultText) {
      plannerText = resultText;
    }
  }

  const payload = JSON.parse(extractJsonBlock(plannerText));
  return plannerDecisionSchema.parse(payload);
}

async function waitForBrowseToSettle(session: RuntimeDemoSession, signal?: AbortSignal) {
  await runBrowseCommand(session, "wait", ["load", "domcontentloaded", "--timeout", "5000"], { signal }).catch(() => {});
  signal?.throwIfAborted();
  await runBrowseCommand(session, "wait", ["timeout", "250"], { signal }).catch(() => {});
  signal?.throwIfAborted();
}

async function switchToNewestTabIfNeeded(
  session: RuntimeDemoSession,
  previousPageTargetIds: string[],
  signal?: AbortSignal
) {
  const pages = await listPages(session, signal);
  const previousTargets = new Set(previousPageTargetIds);
  const newestPage = pages.find((page) => !previousTargets.has(page.targetId));

  if (!newestPage) {
    return {
      pages,
      switchedTo: null
    };
  }

  await runBrowseCommand(session, "tab_switch", [String(newestPage.index)], { signal });
  return {
    pages,
    switchedTo: newestPage
  };
}

async function getActivePageState(session: RuntimeDemoSession, signal?: AbortSignal) {
  const [titlePayload, urlPayload] = await Promise.all([
    runBrowseCommand(session, "get", ["title"], { signal }),
    runBrowseCommand(session, "get", ["url"], { signal })
  ]);

  return {
    title: typeof titlePayload.title === "string" ? titlePayload.title : null,
    url: typeof urlPayload.url === "string" ? urlPayload.url : null
  };
}

type ExecutableBrowserAction = Extract<
  BrowserAction,
  { type: "goto" | "click" | "type" | "press" | "back" }
>;

async function executeBrowserAction(
  session: RuntimeDemoSession,
  action: ExecutableBrowserAction,
  signal?: AbortSignal
) {
  const previousPageTargetIds = [...session.lastPageTargetIds];

  switch (action.type) {
    case "goto":
      await runBrowseCommand(session, "open", [action.url], { signal });
      await waitForBrowseToSettle(session, signal);
      return getActivePageState(session, signal);
    case "click": {
      await runBrowseCommand(session, "click", [action.ref], { signal });
      await waitForBrowseToSettle(session, signal);
      const tabResult = await switchToNewestTabIfNeeded(session, previousPageTargetIds, signal);
      const activeState = await getActivePageState(session, signal);
      return {
        ...activeState,
        switchedTab: Boolean(tabResult.switchedTo),
        switchedTabUrl: tabResult.switchedTo?.url ?? null
      };
    }
    case "type":
      await runBrowseCommand(session, "type", [action.text], { signal });
      return getActivePageState(session, signal);
    case "press":
      await runBrowseCommand(session, "press", [action.key], { signal });
      await waitForBrowseToSettle(session, signal);
      return getActivePageState(session, signal);
    case "back":
      await runBrowseCommand(session, "back", [], { signal });
      await waitForBrowseToSettle(session, signal);
      return getActivePageState(session, signal);
  }
}

function describeBrowserAction(action: ExecutableBrowserAction, payload: Record<string, unknown>) {
  const title = typeof payload.title === "string" ? payload.title : "Unknown page";
  const url = typeof payload.url === "string" ? payload.url : "unknown URL";

  switch (action.type) {
    case "goto":
      return `Opened ${url} (${title}).`;
    case "click":
      return payload.switchedTab
        ? `Clicked ${action.ref}, switched to a new tab, and landed on ${url}.`
        : `Clicked ${action.ref} and landed on ${url}.`;
    case "type":
      return `Typed "${action.text}".`;
    case "press":
      return `Pressed ${action.key}.`;
    case "back":
      return `Went back to ${url}.`;
  }
}

function normalizeInstructionText(instruction: string) {
  return instruction
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getInstructionTokenSet(instruction: string) {
  const tokens = normalizeInstructionText(instruction)
    .split(" ")
    .filter(Boolean)
    .map((token) => INSTRUCTION_ALIASES.get(token) ?? token)
    .filter((token) => token.length > 1 && !INSTRUCTION_STOP_WORDS.has(token));

  return new Set(tokens);
}

function hasConflictingOrdinals(left: Set<string>, right: Set<string>) {
  const leftOrdinals = [...left].filter((token) => ORDINAL_WORDS.has(token));
  const rightOrdinals = [...right].filter((token) => ORDINAL_WORDS.has(token));

  if (!leftOrdinals.length || !rightOrdinals.length) {
    return false;
  }

  return !leftOrdinals.some((token) => right.has(token));
}

function areInstructionsSimilar(left?: string | null, right?: string | null) {
  if (!left || !right) {
    return false;
  }

  if (normalizeInstructionText(left) === normalizeInstructionText(right)) {
    return true;
  }

  const leftTokens = getInstructionTokenSet(left);
  const rightTokens = getInstructionTokenSet(right);

  if (!leftTokens.size || !rightTokens.size || hasConflictingOrdinals(leftTokens, rightTokens)) {
    return false;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const smallerSetSize = Math.min(leftTokens.size, rightTokens.size);

  if (smallerSetSize <= 3) {
    return overlap >= 2;
  }

  return overlap / smallerSetSize >= SIMILAR_INSTRUCTION_OVERLAP_THRESHOLD;
}

function hasDirectNavigationIntent(instruction: string) {
  const normalized = normalizeInstructionText(instruction);
  if (!/(^|\s)(go|head|navigate|open|visit)(\s|$)/.test(normalized)) {
    return false;
  }

  const tokens = normalized.split(" ");
  return !tokens.some((token) => DIRECT_NAVIGATION_REJECT_TERMS.has(token));
}

function stripDirectNavigationTarget(instruction: string) {
  return instruction
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/\b(please|can you|could you|for me)\b/g, " ")
    .replace(/\b(go|head|navigate|open|visit)\b/g, " ")
    .replace(/\b(to|the|a|an|official|website|site|homepage|home page)\b/g, " ")
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDirectNavigationTarget(target: string) {
  return target
    .replace(/\bbrowser\s*-?\s*based?\b/g, "browserbase")
    .replace(/\bbrowser\s+base\b/g, "browserbase")
    .replace(/\beleven\s+labs\b/g, "elevenlabs")
    .replace(/\b11\s+labs\b/g, "elevenlabs")
    .replace(/\b11labs\b/g, "elevenlabs")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function getDirectNavigationUrl(instruction: string) {
  if (!hasDirectNavigationIntent(instruction)) {
    return null;
  }

  const target = normalizeDirectNavigationTarget(stripDirectNavigationTarget(instruction));
  if (!target) {
    return null;
  }

  for (const { aliases, url } of DIRECT_NAVIGATION_TARGETS) {
    if (aliases.some((alias) => target.includes(alias))) {
      return url;
    }
  }

  const domainMatch = target.match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/);
  if (domainMatch) {
    return `https://${domainMatch[1]}`;
  }

  const slug = target.replace(/\s+/g, "");
  if (!slug || slug.length < 2) {
    return null;
  }

  return `https://www.${slug}.com/`;
}

function formatNavigationCompleteSummary(payload: Record<string, unknown>) {
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "the requested site";
  const url = typeof payload.url === "string" && payload.url.trim() ? payload.url : "the requested site";
  return `Opened ${title} at ${url}.`;
}

function assertNavigationSucceeded(action: ExecutableBrowserAction, payload: Record<string, unknown>) {
  if (action.type !== "goto" && action.type !== "click") {
    return;
  }

  const url = typeof payload.url === "string" ? payload.url : "";
  if (url.startsWith("chrome-error://")) {
    throw new Error(`Navigation failed and Chrome showed an error page for ${action.type === "goto" ? action.url : action.ref}.`);
  }
}

async function abortActiveRun(session: RuntimeDemoSession) {
  if (!session.abortController || !session.busy) {
    return;
  }

  if (session.abortController.signal.aborted) {
    return;
  }

  session.abortController.abort();
  session.currentStep = "Interrupting the current run.";
  session.lastNarration = "Stopping the current action.";
  pushEvent(session, "system", "Replacing the previous controller run.");
  publishSession(session);

  try {
    await session.activeRun;
  } catch {
    // Ignore interrupted runs.
  }
}

function markRunComplete(session: RuntimeDemoSession, summary: string) {
  session.status = "ready";
  session.currentStep = "Completed.";
  session.lastSummary = summary;
  session.error = null;
  setControlOutcome(session, "completed", summary);
  pushEvent(session, "system", summary, {
    runId: session.activeRunId
  });
}

function markRunBlocked(session: RuntimeDemoSession, reason: string, question?: string) {
  const message = question ? `${reason} ${question}` : reason;
  session.status = "blocked";
  session.currentStep = "Blocked.";
  session.lastNarration = question ?? reason;
  session.lastSummary = message;
  session.error = null;
  setControlOutcome(session, "blocked", message);
  pushEvent(session, "system", message, {
    runId: session.activeRunId,
    speakable: session.lastNarration
  });
}

function markRunInterrupted(session: RuntimeDemoSession, runId: string | null) {
  session.status = "idle";
  session.currentStep = null;
  session.lastNarration = "Interrupted.";
  session.lastSummary = "Controller run interrupted.";
  session.error = null;
  setControlOutcome(session, "interrupting", "Controller run interrupted.");
  pushEvent(session, "system", "Controller run interrupted.", {
    runId
  });
  publishSession(session);
}

function queueFollowUpInstruction(session: RuntimeDemoSession, input: DemoControlInput) {
  const duplicatePending = session.pendingQueue.some((queuedInput) =>
    areInstructionsSimilar(queuedInput.instruction, input.instruction)
  );
  const duplicateCurrent = areInstructionsSimilar(session.lastInstruction, input.instruction);

  if (duplicateCurrent || duplicatePending) {
    setControlOutcome(session, "duplicate_ignored", "That request is already running or queued.");
    return;
  }

  session.pendingQueue.push({
    ...input,
    interrupt: false
  });

  setControlOutcome(session, "queued", "Queued behind the active browser task.");
  pushEvent(session, "system", `Queued next instruction: ${input.instruction}`);
  publishSession(session);
}

function queueReplacementInstruction(session: RuntimeDemoSession, input: DemoControlInput) {
  const duplicatePending = session.pendingQueue.some((queuedInput) =>
    areInstructionsSimilar(queuedInput.instruction, input.instruction)
  );
  const duplicateCurrent = areInstructionsSimilar(session.lastInstruction, input.instruction);

  if (duplicatePending || duplicateCurrent) {
    setControlOutcome(session, "duplicate_ignored", "That request is already running or queued.");
    return;
  }

  session.pendingQueue = [{
    ...input,
    interrupt: false
  }];

  setControlOutcome(session, "interrupting", "Replacing the active browser task with the latest request.");
  pushEvent(session, "system", `Queued next instruction: ${input.instruction}`);
  session.currentStep = "Queuing the latest instruction.";
  session.lastNarration = "Switching to your latest request.";
  publishSession(session);

  void abortActiveRun(session);
}

async function withSessionMutation<T>(session: RuntimeDemoSession, fn: () => Promise<T>) {
  const previous = session.mutationLock;
  let release!: () => void;
  session.mutationLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  try {
    await previous.catch(() => {
      // Keep the mutation chain alive even if a previous mutation rejected.
    });

    return await fn();
  } finally {
    release();
  }
}

async function runInstructionLoop(session: RuntimeDemoSession, input: DemoControlInput) {
  const runId = session.activeRunId;
  const abortController = session.abortController;
  if (!runId || !abortController) {
    return;
  }

  try {
    await ensureBrowserRuntime(session);

    const directNavigationUrl = getDirectNavigationUrl(input.instruction);
    if (directNavigationUrl) {
      session.status = "acting";
      session.stepCount = 1;
      session.currentStep = `Opening ${directNavigationUrl}.`;
      session.lastNarration = "Opening that site now.";
      pushEvent(session, "assistant", `Direct navigation request resolved to ${directNavigationUrl}.`, {
        runId,
        step: 1,
        speakable: session.lastNarration
      });
      publishSession(session);

      const payload = await executeBrowserAction(
        session,
        { type: "goto", url: directNavigationUrl },
        abortController.signal
      );
      abortController.signal.throwIfAborted();
      assertNavigationSucceeded({ type: "goto", url: directNavigationUrl }, payload);

      await syncPageState(session, {
        title: typeof payload.title === "string" ? payload.title : null,
        url: typeof payload.url === "string" ? payload.url : null
      });
      pushEvent(session, "browser", describeBrowserAction({ type: "goto", url: directNavigationUrl }, payload), {
        runId,
        step: 1
      });

      markRunComplete(session, formatNavigationCompleteSummary(payload));
      publishSession(session);
      return;
    }

    session.currentStep = "Inspecting the current browser state.";
    publishSession(session);

    let inspection = await inspectBrowser(session, abortController.signal);
    abortController.signal.throwIfAborted();
    publishSession(session);

    for (let step = 1; step <= MAX_STEP_COUNT; step += 1) {
      if (abortController.signal.aborted) {
        break;
      }

      session.status = "planning";
      session.stepCount = step;
      session.currentStep = `Planning step ${step}.`;
      publishSession(session);

      const decision = await planNextStep(session, input.instruction, inspection, abortController);
      abortController.signal.throwIfAborted();

      session.stepCount = step;
      session.currentStep = decision.reason;
      session.lastNarration = decision.spokenUpdate;
      pushEvent(session, "assistant", decision.reason, {
        runId,
        step,
        speakable: decision.spokenUpdate
      });
      publishSession(session);

      if (decision.action.type === "done") {
        markRunComplete(session, decision.action.summary);
        publishSession(session);
        return;
      }

      if (decision.action.type === "answer") {
        session.status = "answering";
        const evidence =
          decision.action.evidence?.length
            ? ` Evidence: ${decision.action.evidence.join(" ")}`
            : "";
        markRunComplete(session, `${decision.action.answer}${evidence}`);
        publishSession(session);
        return;
      }

      if (decision.action.type === "blocked") {
        markRunBlocked(session, decision.action.reason, decision.action.question);
        publishSession(session);
        return;
      }

      abortController.signal.throwIfAborted();
      session.status = "acting";
      publishSession(session);

      try {
        const payload = await executeBrowserAction(session, decision.action, abortController.signal);
        abortController.signal.throwIfAborted();
        assertNavigationSucceeded(decision.action, payload);
        await syncPageState(session, {
          title: typeof payload.title === "string" ? payload.title : null,
          url: typeof payload.url === "string" ? payload.url : null
        });
        pushEvent(session, "browser", describeBrowserAction(decision.action, payload), {
          runId,
          step
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          markRunInterrupted(session, runId);
          return;
        }

        const message = error instanceof Error ? error.message : "Browser action failed.";
        session.lastNarration = "That path failed. Trying another route.";
        session.currentStep = `Recovering from failed ${decision.action.type}.`;
        pushEvent(session, "error", message, {
          runId,
          step,
          speakable: session.lastNarration
        });
        publishSession(session);
      }

      abortController.signal.throwIfAborted();
      inspection = await inspectBrowser(session, abortController.signal);
      abortController.signal.throwIfAborted();
      publishSession(session);
    }

    if (abortController.signal.aborted) {
      markRunInterrupted(session, runId);
      return;
    }

    markRunComplete(
      session,
      "I stopped after several browser steps without fully confirming the result. The browser state on screen is the latest source of truth."
    );
    publishSession(session);
  } catch (error) {
    if (abortController.signal.aborted) {
      markRunInterrupted(session, runId);
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown controller error.";
    session.status = "error";
    session.error = message;
    session.currentStep = "Run failed.";
    setControlOutcome(session, "error", message);
    pushEvent(session, "error", message, {
      runId
    });
    publishSession(session);
  } finally {
    session.busy = false;
    session.abortController = null;
    session.activeRun = null;
    await syncPageState(session);
    publishSession(session);

    const nextInput = session.pendingQueue.shift();
    if (nextInput) {
      void Promise.resolve().then(() => executeInstruction(nextInput)).catch((queuedError) => {
        const message =
          queuedError instanceof Error ? queuedError.message : "Failed to start the queued controller run.";
        session.status = "error";
        session.error = message;
        session.currentStep = "Queued run failed to start.";
        setControlOutcome(session, "error", message);
        pushEvent(session, "error", message);
        publishSession(session);
      });
    }
  }
}

async function executeInstruction(input: DemoControlInput): Promise<DemoSessionSnapshot> {
  const session = getOrCreateSession(input.demoId);

  return withSessionMutation(session, async () => {
    if (session.busy) {
      const duplicateCurrent = areInstructionsSimilar(session.lastInstruction, input.instruction);
      const duplicatePending = session.pendingQueue.some((queuedInput) =>
        areInstructionsSimilar(queuedInput.instruction, input.instruction)
      );

      if (duplicateCurrent || duplicatePending) {
        setControlOutcome(session, "duplicate_ignored", "That request is already running or queued.");
        return toSnapshot(session);
      }

      if (input.interrupt) {
        queueReplacementInstruction(session, input);
      } else {
        queueFollowUpInstruction(session, input);
      }

      return toSnapshot(session);
    }

    if (input.interrupt) {
      await abortActiveRun(session);
    }

    const missingConfig = getMissingConfig();
    session.missingConfig = missingConfig;
    if (missingConfig.length) {
      throw new Error(`Missing required environment variables: ${missingConfig.join(", ")}`);
    }

    session.activeRunId = crypto.randomUUID();
    session.busy = true;
    session.status = session.browserbaseSessionId ? "planning" : "starting";
    session.error = null;
    session.lastInstruction = input.instruction;
    session.lastSummary = null;
    session.currentStep = session.browserbaseSessionId ? "Queued for execution." : "Starting Browserbase session.";
    session.lastNarration = "Starting that now.";
    setControlOutcome(session, "accepted", "Accepted and started the browser task.");
    session.stepCount = 0;
    pushEvent(session, "user", input.instruction, {
      runId: session.activeRunId
    });

    const abortController = new AbortController();
    session.abortController = abortController;
    publishSession(session);

    const runPromise = runInstructionLoop(session, input);
    session.activeRun = runPromise;

    void runPromise.catch(() => {
      // The session state already captures execution failures.
    });

    return toSnapshot(session);
  });
}

export function getDemoSnapshot(demoId: string): DemoSessionSnapshot {
  return toSnapshot(getOrCreateSession(demoId));
}

export function subscribeToDemo(demoId: string, subscriber: SessionSubscriber) {
  const subscribers = getSubscriberStore();
  const existing = subscribers.get(demoId) ?? new Set<SessionSubscriber>();
  existing.add(subscriber);
  subscribers.set(demoId, existing);

  return () => {
    const current = subscribers.get(demoId);
    if (!current) {
      return;
    }

    current.delete(subscriber);
    if (!current.size) {
      subscribers.delete(demoId);
    }
  };
}

export async function runDemoInstruction(input: DemoControlInput): Promise<DemoSessionSnapshot> {
  return executeInstruction(input);
}
