"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoEvent, DemoSessionSnapshot } from "../lib/demo-types";

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
  stepCount: 0,
  error: null,
  missingConfig: [],
  events: []
};

type VoiceStatus = "idle" | "connecting" | "connected" | "error";

type TranscriptLine = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  createdAt: string;
};

export function DemoClient() {
  const [demoId] = useState(() => crypto.randomUUID());
  const [session, setSession] = useState<DemoSessionSnapshot>({
    ...EMPTY_SESSION,
    demoId
  });
  const [uiError, setUiError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [, setCallId] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const appendTranscriptLine = useCallback((role: TranscriptLine["role"], text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setTranscript((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role,
        text: trimmed,
        createdAt: new Date().toISOString()
      }
    ]);
  }, []);

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

  const handleRealtimeEvent = useCallback(
    (rawEvent: unknown) => {
      if (!rawEvent || typeof rawEvent !== "object" || !("type" in rawEvent)) {
        return;
      }

      const event = rawEvent as Record<string, unknown>;
      const type = String(event.type);

      if (type === "error") {
        const error = event.error as { message?: string } | undefined;
        appendTranscriptLine("system", error?.message ?? "Realtime session error.");
        return;
      }

      if (type === "session.created") {
        appendTranscriptLine("system", "OpenAI Realtime session connected.");
        return;
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        if (typeof event.transcript === "string") {
          appendTranscriptLine("user", event.transcript);
        }
        return;
      }

      if (type === "response.audio_transcript.done" || type === "response.text.done") {
        if (typeof event.transcript === "string") {
          appendTranscriptLine("agent", event.transcript);
        } else if (typeof event.text === "string") {
          appendTranscriptLine("agent", event.text);
        }
      }
    },
    [appendTranscriptLine]
  );

  const stopVoice = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    setCallId(null);
    setVoiceStatus("idle");
    appendTranscriptLine("system", "Voice session ended.");
  }, [appendTranscriptLine]);

  useEffect(() => stopVoice, [stopVoice]);

  const startVoice = async () => {
    setUiError(null);
    setVoiceStatus("connecting");

    try {
      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioRef.current = audioElement;

      peerConnection.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mediaStream;
      mediaStream.getTracks().forEach((track) => peerConnection.addTrack(track, mediaStream));

      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;

      dataChannel.addEventListener("open", () => {
        setVoiceStatus("connected");
        appendTranscriptLine("system", "Data channel connected.");
        dataChannel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Greet the user in one short sentence and ask what they would like to do in the browser. Do not suggest, name, or assume any specific website or task — wait for the user to tell you."
            }
          })
        );
      });

      dataChannel.addEventListener("message", (event) => {
        try {
          handleRealtimeEvent(JSON.parse(event.data));
        } catch {
          appendTranscriptLine("system", "Received an unreadable Realtime event.");
        }
      });

      peerConnection.addEventListener("connectionstatechange", () => {
        if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
          setVoiceStatus("error");
        }
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const response = await fetch(`/api/realtime/connect?demoId=${encodeURIComponent(demoId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || "Realtime connection failed.");
      }

      const nextCallId = response.headers.get("X-OpenAI-Call-Id");
      setCallId(nextCallId);

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await response.text()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice session failed to start.";
      setUiError(message);
      setVoiceStatus("error");
      appendTranscriptLine("system", message);
      stopVoice();
    }
  };

  const conversation = mergeConversation(session.events, transcript);
  const latestConversation = [...conversation].reverse();

  return (
    <main className="demo-page">
      <section className="demo-left-panel">
        <div className="hero-card intro-card">
          <div className="eyebrow">A voice agent + a browser agent</div>
          <h1>Give your agent access to the whole web.</h1>
          <p className="hero-copy">
            A voice agent talks with the user. A browser agent operates a real browser underneath it — opening sites,
            clicking, and reading pages. They share one live session, so what the agent says stays in sync with what it
            does.
          </p>
          <p className="hero-note">A blueprint for giving any voice agent hands on the web.</p>
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
                disabled={voiceStatus === "connecting" || voiceStatus === "connected"}
                onClick={() => void startVoice()}
                type="button"
              >
                Start voice
              </button>
              <button
                className="ghost-button"
                disabled={voiceStatus !== "connecting" && voiceStatus !== "connected"}
                onClick={stopVoice}
                type="button"
              >
                End voice
              </button>
            </div>
          </div>
          <p className="hero-copy voice-copy">
            Start voice, then just talk — ask it to open a site, search, click, or read a page, and watch it browse
            live.
          </p>
          {session.busy ? <p className="inline-status">The agent is working on your request.</p> : null}
          {uiError ? <p className="error-line">{uiError}</p> : null}
        </div>
      </section>

      <section className="demo-right-panel">
        <div className="browser-shell">
          <div className="browser-header">
            <div>
              <span className="field-label">Live browser session</span>
              <strong>{session.pageTitle ?? "Waiting for the first instruction"}</strong>
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
              title="Live browser session"
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="browser-placeholder">
              <p>The live browser appears here once you start voice and ask the agent to open a site.</p>
            </div>
          )}
        </div>

        <div className="stack-card conversation-card">
          <div className="section-heading">
            <span>Conversation</span>
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
                <p>The conversation appears here once you start talking and the agent starts browsing.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function mergeConversation(controllerEvents: DemoEvent[], transcript: TranscriptLine[]) {
  const controllerLines = controllerEvents.map((event) => ({
    id: `controller-${event.id}`,
    kind: event.kind,
    message: event.speakable ? `${event.message} ${event.speakable}`.trim() : event.message,
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

function formatKindLabel(kind: string) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

async function readErrorMessage(response: Response) {
  const payload = await response.text();
  if (!payload.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as { error?: string };
    return parsed.error ?? payload;
  } catch {
    return payload;
  }
}
