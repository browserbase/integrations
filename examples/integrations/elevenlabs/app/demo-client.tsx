"use client";

import {
  ConversationProvider,
  useConversation,
  useConversationClientTool,
  useConversationStatus
} from "@elevenlabs/react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import type { DemoControlInput, DemoEvent, DemoSessionSnapshot } from "../lib/demo-types";

const EMPTY_SESSION: DemoSessionSnapshot = {
  demoId: "",
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
  missingConfig: [],
  events: []
};

type TranscriptLine = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  createdAt: string;
};

export function DemoClient() {
  return (
    <ConversationProvider>
      <DemoShell />
    </ConversationProvider>
  );
}

function DemoShell() {
  const [demoId] = useState(() => crypto.randomUUID());
  const [session, setSession] = useState<DemoSessionSnapshot>({
    ...EMPTY_SESSION,
    demoId
  });
  const [uiError, setUiError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [toolBusy, setToolBusy] = useState(false);
  const lastVoiceContextRef = useRef<string | null>(null);

  const appendTranscriptLine = useCallback((role: TranscriptLine["role"], text: string) => {
    setTranscript((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role,
        text,
        createdAt: new Date().toISOString()
      }
    ]);
  }, []);

  const {
    startSession,
    endSession,
    sendContextualUpdate
  } = useConversation({
    onError: (error: unknown) => {
      appendTranscriptLine("system", formatConversationError(error));
    },
    onConnect: (details: unknown) => {
      const conversationId =
        details && typeof details === "object" && "conversationId" in details
          ? String(details.conversationId)
          : "connected";
      appendTranscriptLine("system", `Voice connected: ${conversationId}`);
    },
    onDisconnect: (details: unknown) => {
      const reason =
        details && typeof details === "object" && "reason" in details && typeof details.reason === "string"
          ? details.reason
          : "disconnected";
      appendTranscriptLine("system", `Voice session ended: ${reason}`);
    },
    onStatusChange: (details: unknown) => {
      const status =
        details && typeof details === "object" && "status" in details && typeof details.status === "string"
          ? details.status
          : null;

      if (!status || status === "connecting" || status === "connected") {
        return;
      }

      appendTranscriptLine("system", `Voice status: ${status}`);
    },
    onDebug: (info: unknown) => {
      console.info("[voice-debug]", info);
    },
    onMessage: (message: unknown) => {
      const normalized = normalizeConversationMessage(message);
      if (!normalized) {
        return;
      }

      setTranscript((current) => [...current, normalized]);
    }
  });

  const { status: voiceStatus, message: voiceStatusMessage } = useConversationStatus();
  const hasVoiceAgent = Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  const voiceConnected = voiceStatus === "connected";
  const voiceSessionActive = voiceStatus === "connecting" || voiceConnected;
  const voiceStatusHint =
    voiceStatusMessage === "Permission denied"
      ? "Allow microphone access for this site. If the in-app browser does not surface a mic prompt, open the demo in Chrome and grant mic access there."
      : null;

  const refreshSession = useCallback(async () => {
    const response = await fetch(`/api/demo/session?demoId=${encodeURIComponent(demoId)}`);
    if (!response.ok) {
      return;
    }

    const nextSession = (await response.json()) as DemoSessionSnapshot;
    setSession(nextSession);
  }, [demoId]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const source = new EventSource(`/api/demo/stream?demoId=${encodeURIComponent(demoId)}`);

    const onSnapshot = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const nextSession = JSON.parse(messageEvent.data) as DemoSessionSnapshot;
      setSession(nextSession);
    };

    source.addEventListener("snapshot", onSnapshot);
    source.onerror = () => {
      void refreshSession();
    };

    return () => {
      source.removeEventListener("snapshot", onSnapshot);
      source.close();
    };
  }, [demoId, refreshSession]);

  useEffect(() => {
    if (!voiceConnected || !sendContextualUpdate) {
      return;
    }

    const context = buildVoiceContext(session);
    if (!context || lastVoiceContextRef.current === context.key) {
      return;
    }

    lastVoiceContextRef.current = context.key;
    void sendContextualUpdate(context.message);
  }, [sendContextualUpdate, session, voiceConnected]);

  const startControllerRun = useCallback(
    async (input: DemoControlInput) => {
      setToolBusy(true);
      setUiError(null);

      try {
        const response = await fetch("/api/demo/control", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        });

        const payload = (await response.json()) as DemoSessionSnapshot | { error?: string };
        if (!response.ok) {
          throw new Error("error" in payload ? payload.error ?? "Controller request failed." : "Controller request failed.");
        }

        const nextSession = payload as DemoSessionSnapshot;
        setSession(nextSession);
        return nextSession;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Controller request failed.";
        setUiError(message);
        throw error;
      } finally {
        setToolBusy(false);
        startTransition(() => {
          void refreshSession();
        });
      }
    },
    [refreshSession]
  );

  useConversationClientTool(
    "control_demo",
    async (rawInput: { instruction?: string; interrupt?: boolean; goal?: string }) => {
      const instruction = rawInput.instruction?.trim() || rawInput.goal?.trim();
      if (!instruction) {
        throw new Error("Missing instruction for control_demo.");
      }

      const snapshot = await startControllerRun({
        demoId,
        instruction,
        interrupt: rawInput.interrupt
      });

      return JSON.stringify({
        ok: true,
        accepted: true,
        runId: snapshot.activeRunId,
        controllerState: snapshot.status,
        controlOutcome: snapshot.lastControlOutcome,
        controlMessage: snapshot.lastControlMessage,
        queuedInstructionCount: snapshot.queuedInstructionCount,
        voiceGuidance: buildToolVoiceGuidance(snapshot),
        speakableUpdate: buildToolSpeakableUpdate(snapshot),
        currentStep: snapshot.currentStep,
        currentUrl: snapshot.currentUrl,
        pageTitle: snapshot.pageTitle,
        liveViewUrl: snapshot.liveViewUrl
      });
    }
  );

  const handleVoiceStart = async () => {
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agentId) {
      setUiError("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is missing.");
      return;
    }

    setUiError(null);

    try {
      await startSession({
        agentId,
        connectionType: "websocket",
        useWakeLock: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice session failed to start.";
      setUiError(message);
    }
  };

  const conversation = mergeConversation(session.events, transcript);
  const latestConversation = [...conversation].reverse();

  return (
    <main className="demo-page">
      <section className="demo-left-panel">
        <div className="hero-card intro-card">
          <div className="eyebrow">Browserbase and ElevenLabs</div>
          <h1>Give your voice agent access to the whole web.</h1>
          <p className="hero-copy">
            ElevenLabs handles the conversation. Browserbase keeps the live browser session attached to the controller
            underneath it, so browsing, retries, and voice updates stay aligned.
          </p>
          <p className="hero-note">One controller owns the browser state. The voice layer stays in sync with it.</p>
        </div>

        <div className="stack-card voice-card">
          <div className="voice-bar">
            <div>
              <span className="field-label">Voice session</span>
              <strong>{voiceStatus}</strong>
            </div>
            <div className="voice-actions">
              <button
                className="primary-button"
                disabled={!hasVoiceAgent || voiceSessionActive}
                onClick={handleVoiceStart}
                type="button"
              >
                Start voice
              </button>
              <button
                className="ghost-button"
                disabled={!voiceSessionActive}
                onClick={() => void endSession()}
                type="button"
              >
                End voice
              </button>
            </div>
          </div>
          <p className="hero-copy voice-copy">
            Start voice, then ask the agent to open, click, read, or continue working in the shared Browserbase
            session.
          </p>
          {session.busy ? <p className="inline-status">The controller is working on the latest request.</p> : null}
          {toolBusy && !session.busy ? <p className="inline-status">Sending the latest instruction to the controller.</p> : null}
          {voiceStatusMessage ? <p className="error-line">{voiceStatusMessage}</p> : null}
          {voiceStatusHint ? <p className="hero-copy">{voiceStatusHint}</p> : null}
          {uiError ? <p className="error-line">{uiError}</p> : null}
        </div>

      </section>

      <section className="demo-right-panel">
        <div className="browser-shell">
          <div className="browser-header">
            <div>
              <span className="field-label">Live Browserbase session</span>
              <strong>{session.pageTitle ?? "Waiting for the first browser instruction"}</strong>
            </div>
            <div className="browser-status">
              <span className={`browser-pill ${session.busy ? "active" : ""}`}>{session.busy ? "Running" : "Idle"}</span>
            </div>
          </div>
          <div className="browser-meta">
            <span>{session.currentUrl ?? "No page yet"}</span>
          </div>

          {session.liveViewUrl ? (
            <iframe
              className="browser-frame"
              src={session.liveViewUrl}
              title="Browserbase live view"
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="browser-placeholder">
              <p>The Browserbase session will appear here after the first voice instruction reaches the controller.</p>
              <p>Start voice and ask the agent to open a site to bootstrap the shared session.</p>
            </div>
          )}
        </div>

        <div className="stack-card conversation-card">
          <div className="section-heading">
            <span>Conversation thread</span>
            <strong>{session.currentStep ?? session.status}</strong>
          </div>
          <div className="transcript">
            {latestConversation.length ? (
              latestConversation.map((entry) => (
                <article className={`transcript-line ${entry.kind}`} key={entry.id}>
                  <span>{formatKindLabel(entry.kind)}</span>
                  <p>{entry.message}</p>
                </article>
              ))
            ) : (
              <div className="transcript-empty">
                <p>The thread will populate once the voice agent starts speaking or the browser controller emits events.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function buildVoiceContext(session: DemoSessionSnapshot) {
  if (session.status === "blocked" && session.lastControlMessage) {
    return {
      key: `blocked:${session.activeRunId}:${session.lastControlMessage}`,
      message: `Controller is blocked: ${session.lastControlMessage}. Ask the user that clarification once. Do not repeat earlier progress updates. Current URL: ${session.currentUrl ?? "unknown"}.`
    };
  }

  if (session.lastControlOutcome === "queued" && session.lastControlMessage) {
    return {
      key: `queued:${session.activeRunId}:${session.queuedInstructions.join("|")}`,
      message: `Background controller state: ${session.lastControlMessage}. Do not repeat this aloud unless the user asks.`
    };
  }

  if (session.status === "error" && session.error) {
    return {
      key: `error:${session.activeRunId}:${session.error}`,
      message: `Controller error: ${session.error}. Explain it briefly once if the user is waiting.`
    };
  }

  if (session.lastControlOutcome === "completed" && session.lastSummary) {
    return {
      key: `completed:${session.activeRunId}:${session.lastSummary}`,
      message: `Controller finished: ${session.lastSummary}. Give the user a concise answer. Current URL: ${session.currentUrl ?? "unknown"}.`
    };
  }

  return null;
}

function buildToolVoiceGuidance(snapshot: DemoSessionSnapshot) {
  switch (snapshot.lastControlOutcome) {
    case "duplicate_ignored":
    case "running":
      return "The browser controller is already working on this request. Do not call control_demo again for paraphrases of the same request, and do not repeat the same progress phrase aloud.";
    case "queued":
      return "This instruction is queued behind the active browser task. Acknowledge once only if useful; do not call control_demo again for the same request.";
    case "interrupting":
      return "The previous browser task is being replaced. Say a brief switching acknowledgement at most once, then wait.";
    case "blocked":
      return "The controller is blocked. Ask the user the clarification in controlMessage instead of retrying the same tool call.";
    case "completed":
      return "The browser controller completed the task. Answer using the final summary and current page state.";
    default:
      return snapshot.busy
        ? "The browser controller is running. Say one short acknowledgement at most, then stay quiet until it completes, blocks, or the user asks something new."
        : "The browser controller is ready for the next user instruction.";
  }
}

function buildToolSpeakableUpdate(snapshot: DemoSessionSnapshot) {
  switch (snapshot.lastControlOutcome) {
    case "accepted":
      return snapshot.lastNarration ?? "Starting that now.";
    case "queued":
      return "I’ll do that next.";
    case "interrupting":
      return "Switching to your latest request.";
    case "blocked":
      return snapshot.lastControlMessage;
    case "completed":
      return snapshot.lastSummary;
    default:
      return null;
  }
}

function mergeConversation(controllerEvents: DemoEvent[], transcript: TranscriptLine[]) {
  const controllerLines = controllerEvents.map((event) => ({
    id: `controller-${event.id}`,
    kind: event.kind,
    message: event.message,
    createdAt: event.createdAt
  }));

  const transcriptLines = transcript.map((entry) => ({
    id: `voice-${entry.id}`,
    kind: entry.role === "agent" ? "assistant" : entry.role,
    message: entry.text,
    createdAt: entry.createdAt
  }));

  return [...controllerLines, ...transcriptLines]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-36);
}

function normalizeConversationMessage(message: unknown): TranscriptLine | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const typedMessage = message as {
    role?: string;
    source?: string;
    text?: string;
    message?: string;
    content?: Array<{ text?: string }>;
  };

  const role = typedMessage.role === "user" || typedMessage.source === "user" ? "user" : "agent";
  const contentFromBlocks = typedMessage.content
    ?.map((block) => block.text?.trim())
    .filter(Boolean)
    .join("\n");
  const text = typedMessage.text ?? typedMessage.message ?? contentFromBlocks;

  if (!text) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString()
  };
}

function formatKindLabel(kind: string) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formatConversationError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    if ("type" in error && typeof error.type === "string" && error.type.trim()) {
      return `Voice session error (${error.type}).`;
    }
  }

  return "Voice session error.";
}
