import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { Browserbase } from "@browserbasehq/sdk";
import { z } from "zod";
import type { DemoControlInput, DemoEvent, DemoSessionSnapshot } from "./demo-types";

const execFileAsync = promisify(execFile);
const MAX_EVENT_COUNT = 40;
const MAX_SNAPSHOT_LINES = 140;
const MAX_LINK_TARGETS = 40;
// Capture far more page text than we show the model at once, so a query-focused
// excerpt can find answers that live deep in long pages (e.g. a stat in a table
// halfway down a 165k-char Wikipedia article).
const MAX_PAGE_TEXT_CHARS = 200000;
const FOCUSED_EXCERPT_HEAD_CHARS = 1500;
const FOCUSED_EXCERPT_WINDOW_CHARS = 600;
const FOCUSED_EXCERPT_MAX_WINDOWS = 10;
const AGENT_MODEL = "claude-sonnet-4-6";
const BROWSE_COMMAND = process.env.BROWSE_BIN ?? "browse";

// One persistent Claude agent runs for the whole voice call. Each browser tool is
// a short, COMPACT result (refs + focused text, never the raw 3.6MB snapshot) so
// the accumulating conversation stays small while the agent keeps full memory of
// what it has already opened and done.
const AGENT_SYSTEM_PROMPT = [
  "You operate a single live web browser on behalf of a user who is speaking to you by voice.",
  "Your only tools are: navigate, click, type_text, press_key, go_back, read_page. You have no shell, no file system, and no other tools — never attempt to use anything else.",
  "To see the current page before answering a question or deciding what to click, call read_page. It returns the page title, URL, an accessibility tree whose elements have refs in [brackets], the visible link targets by ref, and the page text passages most relevant to your query.",
  "Click using a ref taken from the MOST RECENT read_page (pass it without brackets, e.g. 0-5). Never invent a ref.",
  "When you need to search the web, navigate to https://duckduckgo.com/?q=YOUR+QUERY (or Bing). Avoid Google search — it frequently blocks automated browsers with a 'sorry' challenge page. If any page shows a CAPTCHA or 'unusual traffic' block, say so and try a different site rather than getting stuck.",
  "The browser session and this conversation persist for the entire call. Remember what you have already opened and found; the user may refer back to earlier pages or results (\"go back to the first one\", \"compare with before\").",
  "GROUNDING (critical): answer factual questions ONLY from what read_page returns. Never use prior knowledge to state a value, number, or name that should come from the page. When you state a fact, quote the exact sentence it came from. If the information is not on the page, say so plainly and offer to look elsewhere — do not guess.",
  "Keep final answers short and natural — they are spoken aloud. Do the work with tools, then give a concise answer. Do not read raw URLs or refs aloud."
].join("\n");

const BROWSER_TOOL_NAMES = [
  "mcp__browser__read_page",
  "mcp__browser__navigate",
  "mcp__browser__click",
  "mcp__browser__type_text",
  "mcp__browser__press_key",
  "mcp__browser__go_back"
];

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

type AgentInputMessage = {
  type: "user";
  message: { role: "user"; content: string };
  parent_tool_use_id: null;
};

type AgentInputStream = {
  iterator: AsyncGenerator<AgentInputMessage>;
  push: (text: string) => void;
  close: () => void;
};

type RuntimeDemoSession = DemoSessionSnapshot & {
  browserbaseClient: Browserbase | null;
  browseSessionName: string;
  browseConnectUrl: string | null;
  lastPageTargetIds: string[];
  lastBrowseError: string | null;
  lastInspection: BrowserInspection | null;
  // Persistent agent state for the whole call:
  agentRunning: boolean;
  agentInput: AgentInputStream | null;
  // The query() handle, kept loosely typed so we can call interrupt().
  agentQuery: { interrupt: () => Promise<void> } | null;
  turnFinalText: string;
};

type DemoStore = Map<string, RuntimeDemoSession>;
type SessionSubscriber = (snapshot: DemoSessionSnapshot) => void;
type SessionSubscriberStore = Map<string, Set<SessionSubscriber>>;

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
    stepCount: 0,
    error: null,
    missingConfig: getMissingConfig(),
    events: [],
    browserbaseClient: null,
    browseSessionName: getBrowseSessionName(demoId),
    browseConnectUrl: null,
    lastPageTargetIds: [],
    lastBrowseError: null,
    lastInspection: null,
    agentRunning: false,
    agentInput: null,
    agentQuery: null,
    turnFinalText: ""
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
  }

  if (!session.browserbaseClient || !session.browserbaseSessionId) {
    return;
  }

  try {
    const liveState = await session.browserbaseClient.sessions.debug(session.browserbaseSessionId);
    const activePage = liveState.pages[0];
    if (pageState?.url == null) {
      session.currentUrl = activePage?.url ?? session.currentUrl;
    }
    if (pageState?.title == null) {
      session.pageTitle = activePage?.title ?? session.pageTitle;
    }
  } catch {
    // Preserve the last known state if Browserbase debug is temporarily unavailable.
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
  session.browseConnectUrl = browserSession.connectUrl;
  session.liveViewUrl = `${debugConnection.debuggerFullscreenUrl}&navbar=false`;

  await syncPageState(session);
  pushEvent(session, "system", "Browserbase live view is ready.");
  pushEvent(session, "system", `Browse CLI is attached to Browserbase session ${browserSession.id}.`);
  publishSession(session);
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

function parseBrowseJson(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Tolerate leading noise (e.g. an "Update available" banner) or trailing
    // text by extracting the first balanced JSON object/array in the output.
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        // Fall through: treat as a non-JSON (action) command result.
      }
    }
    return {};
  }
}

async function runBrowseCommand(
  session: RuntimeDemoSession,
  command: string,
  args: string[] = [],
  options: {
    connect?: boolean;
  } = {}
) {
  if (!session.browserbaseSessionId && options.connect !== false) {
    throw new Error("Browser session is not ready.");
  }

  // This CLI is oclif-style: the command and its positional args come first,
  // then flags. Leading flags are misparsed as a command name.
  const browseArgs = [command, ...args, "--session", session.browseSessionName];
  if (options.connect !== false && session.browseConnectUrl) {
    browseArgs.push("--cdp", session.browseConnectUrl);
  }

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
        maxBuffer: 32 * 1024 * 1024
      }
    );

    session.lastBrowseError = null;
    return parseBrowseJson(stdout);
  } catch (error) {
    const executionError = error as Error & {
      code?: string;
      stdout?: string;
      stderr?: string;
    };

    if (executionError.code === "ENOENT") {
      session.lastBrowseError = "Browse CLI is not installed.";
      throw new Error("Browse CLI is not installed. Install it with `npm install -g @browserbasehq/browse-cli`.");
    }

    const rawOutput = executionError.stdout?.trim() || executionError.stderr?.trim();
    if (rawOutput) {
      try {
        const payload = JSON.parse(rawOutput) as Record<string, unknown>;
        if (typeof payload.error === "string") {
          session.lastBrowseError = payload.error;
          throw new Error(payload.error);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== rawOutput) {
          session.lastBrowseError = parseError.message;
          throw parseError;
        }
      }
    }

    session.lastBrowseError = executionError.message || `Browse CLI ${command} failed.`;
    throw new Error(executionError.message || `Browse CLI ${command} failed.`);
  }
}

async function listPages(session: RuntimeDemoSession) {
  const payload = await runBrowseCommand(session, "tab", ["list"]);
  const pages = normalizePages(payload.tabs);
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

  // The next command re-attaches to the Browserbase session via --cdp.
}

async function inspectBrowserOnce(session: RuntimeDemoSession) {
  // These are all independent read-only commands. Running them sequentially cost
  // ~5s/inspection (each spawn + CDP round-trip to the remote session); in
  // parallel the inspection is bounded by the slowest single call (the snapshot).
  const [snapshotPayload, titlePayload, urlPayload, textPayload, pages] = await Promise.all([
    runBrowseCommand(session, "snapshot"),
    runBrowseCommand(session, "get", ["title"]),
    runBrowseCommand(session, "get", ["url"]),
    runBrowseCommand(session, "get", ["text", "body"]).catch(() => ({ text: "" })),
    listPages(session)
  ]);

  return {
    title: String(titlePayload.title ?? ""),
    url: String(urlPayload.url ?? ""),
    tree: String(snapshotPayload.tree ?? ""),
    pageText: String(textPayload.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_PAGE_TEXT_CHARS),
    xpathMap: normalizeStringRecord(snapshotPayload.xpathMap),
    urlMap: normalizeStringRecord(snapshotPayload.urlMap),
    pages
  } satisfies BrowserInspection;
}

async function inspectBrowser(session: RuntimeDemoSession) {
  try {
    const inspection = await inspectBrowserOnce(session);

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
    const firstError = error instanceof Error ? error.message : "Unknown browse snapshot failure.";

    pushEvent(session, "error", `Browse snapshot failed: ${firstError}`);

    try {
      await resetBrowseDaemon(session);
      const recoveredInspection = await inspectBrowserOnce(session);

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
      runBrowseCommand(session, "get", ["title"]),
      runBrowseCommand(session, "get", ["url"])
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

function extractKeywords(instruction: string): string[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are", "was", "were",
    "what", "whats", "what's", "how", "many", "much", "find", "tell", "me", "show", "get", "go",
    "open", "click", "read", "page", "site", "website", "current", "this", "that", "it", "its",
    "please", "can", "you", "give", "about", "from", "with", "their", "there", "then", "into"
  ]);

  return Array.from(
    new Set(
      instruction
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stop.has(word))
    )
  ).slice(0, 8);
}

// Return the top of the page PLUS the passages most relevant to the query.
// Relevance = how many DISTINCT query keywords co-occur in a window, so a sentence
// where "wild"/"population"/"estimated" cluster beats the hundreds of early-page
// mentions of a single common term. Keeps the agent grounded without dumping the
// whole 165k-char body into the conversation.
function buildFocusedPageText(instruction: string, inspection: BrowserInspection) {
  const body = inspection.pageText;
  if (!body) {
    return "none";
  }

  const head = body.slice(0, FOCUSED_EXCERPT_HEAD_CHARS);
  const keywords = extractKeywords(instruction);
  if (!keywords.length) {
    return `Page start:\n${head}`;
  }

  const lowerBody = body.toLowerCase();
  const half = Math.floor(FOCUSED_EXCERPT_WINDOW_CHARS / 2);
  // Quantitative questions ("how many", "population", "price"…) want the passage
  // with the actual number, so give windows containing digits a small edge.
  const wantsNumber = /\b(population|how many|how much|number|count|percent|percentage|price|cost|rate|amount|figure|estimate|estimated|total|average|score|year)\b/i.test(
    instruction
  );

  // Every match position across all keywords becomes a candidate window center.
  const candidates: number[] = [];
  for (const keyword of keywords) {
    let from = 0;
    let count = 0;
    while (count < 300) {
      const hit = lowerBody.indexOf(keyword, from);
      if (hit === -1) {
        break;
      }
      candidates.push(hit);
      from = hit + keyword.length;
      count += 1;
    }
  }

  const scored = candidates.map((pos) => {
    const start = Math.max(0, pos - half);
    const slice = lowerBody.slice(start, start + FOCUSED_EXCERPT_WINDOW_CHARS);
    let score = keywords.reduce((acc, kw) => acc + (slice.includes(kw) ? 1 : 0), 0);
    if (wantsNumber && /\d/.test(slice)) {
      score += 0.5;
    }
    return { start, pos, score };
  });

  // Highest keyword density first; ties broken by earliest position.
  scored.sort((a, b) => b.score - a.score || a.pos - b.pos);

  const chosen: Array<{ start: number }> = [];
  for (const candidate of scored) {
    if (candidate.start + half < FOCUSED_EXCERPT_HEAD_CHARS) {
      continue; // already covered by the head excerpt
    }
    if (chosen.some((c) => Math.abs(c.start - candidate.start) < FOCUSED_EXCERPT_WINDOW_CHARS)) {
      continue; // overlaps a window we already kept
    }
    chosen.push({ start: candidate.start });
    if (chosen.length >= FOCUSED_EXCERPT_MAX_WINDOWS) {
      break;
    }
  }

  chosen.sort((a, b) => a.start - b.start);

  const parts = [`Page start:\n${head}`];
  if (chosen.length) {
    parts.push(
      `Passages matching the question:\n${chosen
        .map((c) => `…${body.slice(c.start, c.start + FOCUSED_EXCERPT_WINDOW_CHARS)}…`)
        .join("\n---\n")}`
    );
  }

  return parts.join("\n\n");
}

async function waitForBrowseToSettle(session: RuntimeDemoSession) {
  await runBrowseCommand(session, "wait", ["load", "domcontentloaded", "--timeout", "5000"]).catch(() => {});
  await runBrowseCommand(session, "wait", ["timeout", "250"]).catch(() => {});
}

async function switchToNewestTabIfNeeded(session: RuntimeDemoSession, previousPageTargetIds: string[]) {
  const pages = await listPages(session);
  const previousTargets = new Set(previousPageTargetIds);
  const newestPage = pages.find((page) => !previousTargets.has(page.targetId));

  if (!newestPage) {
    return { switchedTo: null };
  }

  await runBrowseCommand(session, "tab", ["switch", String(newestPage.index)]);
  return { switchedTo: newestPage };
}

async function getActivePageState(session: RuntimeDemoSession) {
  const [titlePayload, urlPayload] = await Promise.all([
    runBrowseCommand(session, "get", ["title"]),
    runBrowseCommand(session, "get", ["url"])
  ]);

  return {
    title: typeof titlePayload.title === "string" ? titlePayload.title : null,
    url: typeof urlPayload.url === "string" ? urlPayload.url : null
  };
}

function bumpStep(session: RuntimeDemoSession, label: string) {
  session.stepCount += 1;
  session.currentStep = label;
  session.status = "acting";
  publishSession(session);
}

// In-process MCP tools the agent uses to drive the shared Browserbase session.
// Results are deliberately compact so the persistent conversation does not balloon.
function createBrowserToolServer(session: RuntimeDemoSession) {
  return createSdkMcpServer({
    name: "browser",
    version: "1.0.0",
    tools: [
      tool(
        "read_page",
        "Read the current page. Returns its title, URL, an accessibility tree whose elements have refs in [brackets], the visible link targets by ref, and the page text passages most relevant to `query`. Call this before answering a question about the page or before clicking.",
        { query: z.string().optional().describe("What you are looking for on the page, to focus the returned text.") },
        async (args) => {
          bumpStep(session, "Reading the page.");
          const inspection = await inspectBrowser(session);
          publishSession(session);
          const focus = (args.query && args.query.trim()) || session.lastInstruction || "";
          const text = [
            `Title: ${inspection.title || "(none)"}`,
            `URL: ${inspection.url || "(none)"}`,
            "Accessibility tree (element refs shown in [brackets]):",
            formatSnapshotTree(inspection),
            "Link targets by ref:",
            formatLinkTargets(inspection),
            "Relevant page text:",
            buildFocusedPageText(focus, inspection)
          ].join("\n");
          return { content: [{ type: "text" as const, text }] };
        }
      ),
      tool(
        "navigate",
        "Open a URL in the browser.",
        { url: z.string().describe("Absolute URL to open, e.g. https://example.com") },
        async (args) => {
          bumpStep(session, `Opening ${args.url}`);
          await runBrowseCommand(session, "open", [args.url]);
          await waitForBrowseToSettle(session);
          const state = await getActivePageState(session);
          await syncPageState(session, state);
          pushEvent(session, "browser", `Opened ${state.url ?? args.url}${state.title ? ` (${state.title})` : ""}.`);
          publishSession(session);
          return {
            content: [
              {
                type: "text" as const,
                text: `Opened ${state.url ?? args.url} (title: ${state.title ?? ""}). Call read_page to see its contents.`
              }
            ]
          };
        }
      ),
      tool(
        "click",
        "Click an element using a ref (e.g. 0-5) from the most recent read_page.",
        { ref: z.string().describe("Element ref from the latest read_page, without brackets, e.g. 0-5") },
        async (args) => {
          bumpStep(session, `Clicking ${args.ref}`);
          const previous = [...session.lastPageTargetIds];
          await runBrowseCommand(session, "click", [args.ref]);
          await waitForBrowseToSettle(session);
          const tab = await switchToNewestTabIfNeeded(session, previous);
          const state = await getActivePageState(session);
          await syncPageState(session, state);
          const description = tab.switchedTo
            ? `Clicked ${args.ref}, switched to a new tab at ${state.url}.`
            : `Clicked ${args.ref}; now at ${state.url}.`;
          pushEvent(session, "browser", description);
          publishSession(session);
          return { content: [{ type: "text" as const, text: `${description} Call read_page to see the new state.` }] };
        }
      ),
      tool(
        "type_text",
        "Type text into the currently focused input.",
        { text: z.string() },
        async (args) => {
          bumpStep(session, "Typing.");
          await runBrowseCommand(session, "type", [args.text]);
          pushEvent(session, "browser", `Typed "${args.text.slice(0, 40)}".`);
          publishSession(session);
          return { content: [{ type: "text" as const, text: "Typed." }] };
        }
      ),
      tool(
        "press_key",
        "Press a keyboard key such as Enter or Tab.",
        { key: z.string() },
        async (args) => {
          bumpStep(session, `Pressing ${args.key}`);
          await runBrowseCommand(session, "press", [args.key]);
          await waitForBrowseToSettle(session);
          pushEvent(session, "browser", `Pressed ${args.key}.`);
          publishSession(session);
          return { content: [{ type: "text" as const, text: `Pressed ${args.key}.` }] };
        }
      ),
      tool(
        "go_back",
        "Navigate back to the previous page.",
        {},
        async () => {
          bumpStep(session, "Going back.");
          await runBrowseCommand(session, "back");
          await waitForBrowseToSettle(session);
          const state = await getActivePageState(session);
          await syncPageState(session, state);
          pushEvent(session, "browser", `Went back to ${state.url}.`);
          publishSession(session);
          return { content: [{ type: "text" as const, text: `Back at ${state.url}.` }] };
        }
      )
    ]
  });
}

function createAgentInput(): AgentInputStream {
  const queue: AgentInputMessage[] = [];
  let notify: (() => void) | null = null;
  let closed = false;

  const iterator = (async function* () {
    while (!closed) {
      if (!queue.length) {
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
        notify = null;
        continue;
      }
      yield queue.shift()!;
    }
  })();

  return {
    iterator,
    push(text: string) {
      queue.push({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null });
      notify?.();
    },
    close() {
      closed = true;
      notify?.();
    }
  };
}

function finishTurn(session: RuntimeDemoSession, summary: string, isError = false) {
  session.busy = false;
  session.status = isError ? "error" : "ready";
  session.currentStep = isError ? "Run failed." : "Completed.";
  session.lastSummary = summary;
  session.error = isError ? summary : null;
  pushEvent(session, isError ? "error" : "system", summary, { runId: session.activeRunId });
  publishSession(session);
}

// Consume the persistent agent's message stream for the whole call. Each turn ends
// with a `result` message; we surface assistant text as spoken narration and tool
// calls as browser events along the way.
async function consumeAgent(session: RuntimeDemoSession, agentQuery: AsyncIterable<Record<string, unknown>>) {
  try {
    for await (const message of agentQuery) {
      const type = message.type as string;

      if (type === "assistant") {
        const inner = message.message as { content?: Array<Record<string, unknown>> } | undefined;
        for (const block of inner?.content ?? []) {
          if (block.type === "text" && typeof block.text === "string" && block.text.trim()) {
            const text = block.text.trim();
            session.turnFinalText = text;
            session.lastNarration = text.slice(0, 200);
            pushEvent(session, "assistant", text, { runId: session.activeRunId, speakable: text.slice(0, 200) });
            publishSession(session);
          }
        }
      } else if (type === "result") {
        const subtype = message.subtype as string | undefined;
        const rawResult = typeof message.result === "string" ? message.result.trim() : "";
        const answer = session.turnFinalText.trim() || rawResult;
        if (typeof message.session_id === "string") {
          session.claudeSessionId = message.session_id;
        }
        await syncPageState(session);

        if (subtype && subtype !== "success") {
          // Log the real reason so non-success turns are diagnosable.
          console.error(
            `[demo-controller] turn ended subtype=${subtype} is_error=${message.is_error} result="${rawResult.slice(0, 120)}"`
          );
        }

        // An answer is an answer: if the agent produced spoken text, surface it as a
        // normal result even when the SDK flags a soft non-success subtype
        // (interrupted, hit a turn cap, a tool threw but it recovered). Only show a
        // real error when the turn produced NO usable answer — and never the bare
        // word "Done" in red.
        if (answer && answer.toLowerCase() !== "done." && answer.toLowerCase() !== "done") {
          finishTurn(session, answer, false);
        } else if (subtype === "error_max_turns") {
          finishTurn(session, "I worked through several steps but didn't finish that — want me to keep going?", false);
        } else if (subtype && subtype !== "success") {
          finishTurn(
            session,
            "I couldn't complete that — the page may have blocked automated access. Want me to try a different approach?",
            true
          );
        } else {
          finishTurn(session, answer || "Done.", false);
        }
      }
    }
    // The query closed (input stream ended). Allow a fresh agent next time.
    session.agentRunning = false;
    session.agentInput = null;
    session.agentQuery = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent loop error.";
    session.agentRunning = false;
    session.agentInput = null;
    session.agentQuery = null;
    finishTurn(session, message, true);
  }
}

function ensureAgent(session: RuntimeDemoSession) {
  if (session.agentRunning && session.agentInput) {
    return;
  }

  const input = createAgentInput();
  const server = createBrowserToolServer(session);

  const agentQuery = query({
    prompt: input.iterator as AsyncIterable<never>,
    options: {
      model: AGENT_MODEL,
      systemPrompt: AGENT_SYSTEM_PROMPT,
      mcpServers: { browser: server },
      allowedTools: BROWSER_TOOL_NAMES,
      permissionMode: "bypassPermissions",
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: getAnthropicApiKey() ?? ""
      }
    } as Parameters<typeof query>[0]["options"]
  });

  session.agentRunning = true;
  session.agentInput = input;
  session.agentQuery = agentQuery as unknown as { interrupt: () => Promise<void> };

  void consumeAgent(session, agentQuery as unknown as AsyncIterable<Record<string, unknown>>);
}

async function executeInstruction(input: DemoControlInput): Promise<DemoSessionSnapshot> {
  const session = getOrCreateSession(input.demoId);

  const missingConfig = getMissingConfig();
  session.missingConfig = missingConfig;
  if (missingConfig.length) {
    throw new Error(`Missing required environment variables: ${missingConfig.join(", ")}`);
  }

  await ensureBrowserRuntime(session);
  await syncPageState(session);
  ensureAgent(session);

  // If a turn is mid-flight and the user changed direction, interrupt it before
  // appending the new instruction to the same conversation.
  if (input.interrupt && session.busy && session.agentQuery) {
    pushEvent(session, "system", "Interrupting the current task.");
    try {
      await session.agentQuery.interrupt();
    } catch {
      // Best effort — the new instruction is appended regardless.
    }
  }

  session.activeRunId = crypto.randomUUID();
  session.busy = true;
  session.status = "planning";
  session.error = null;
  session.lastInstruction = input.instruction;
  session.lastSummary = null;
  session.turnFinalText = "";
  session.currentStep = "Working on the request.";
  session.lastNarration = "On it.";
  session.stepCount = 0;
  pushEvent(session, "user", input.instruction, { runId: session.activeRunId });
  publishSession(session);

  session.agentInput?.push(input.instruction);
  return toSnapshot(session);
}

export function getDemoSnapshot(demoId: string): DemoSessionSnapshot {
  return toSnapshot(getOrCreateSession(demoId));
}

export function getDemoReadableContext(demoId: string) {
  const session = getOrCreateSession(demoId);
  const inspection = session.lastInspection;

  return {
    title: inspection?.title || session.pageTitle,
    url: inspection?.url || session.currentUrl,
    pageTextExcerpt: inspection?.pageText ? inspection.pageText.slice(0, 2500) : null,
    snapshotExcerpt: inspection?.tree
      ? inspection.tree
          .trim()
          .split("\n")
          .slice(0, 50)
          .join("\n")
      : null,
    recentEvents: session.events.slice(-8).map((event) => ({
      kind: event.kind,
      message: event.message,
      speakable: event.speakable ?? null
    }))
  };
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

export async function waitForDemoRunToSettle({
  demoId,
  runId,
  timeoutMs = 90000
}: {
  demoId: string;
  runId: string | null;
  timeoutMs?: number;
}): Promise<DemoSessionSnapshot> {
  const initial = getDemoSnapshot(demoId);
  if (!runId || initial.activeRunId !== runId || !initial.busy) {
    return initial;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(getDemoSnapshot(demoId));
    }, timeoutMs);

    const unsubscribe = subscribeToDemo(demoId, (snapshot) => {
      if (snapshot.activeRunId !== runId || snapshot.busy) {
        return;
      }

      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot);
    });
  });
}
