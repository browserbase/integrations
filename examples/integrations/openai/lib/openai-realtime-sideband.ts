import WebSocket from "ws";
import { getDemoReadableContext, runDemoInstruction, waitForDemoRunToSettle } from "./demo-controller";
import { buildRealtimeSessionConfig } from "./realtime-config";

type RealtimeSidebandSession = {
  callId: string;
  demoId: string;
  ws: WebSocket;
  processedCalls: Set<string>;
};

const globalStore = globalThis as typeof globalThis & {
  __openaiRealtimeSidebands?: Map<string, RealtimeSidebandSession>;
};

function getSidebands() {
  if (!globalStore.__openaiRealtimeSidebands) {
    globalStore.__openaiRealtimeSidebands = new Map();
  }

  return globalStore.__openaiRealtimeSidebands;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY ?? process.env.openai_key ?? null;
}

function sendRealtimeEvent(ws: WebSocket, event: Record<string, unknown>) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify(event));
}

function parseFunctionArguments(argumentsJson: unknown) {
  if (typeof argumentsJson !== "string" || !argumentsJson.trim()) {
    return {};
  }

  try {
    return JSON.parse(argumentsJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getFunctionCalls(event: Record<string, unknown>) {
  if (event.type !== "response.done") {
    return [];
  }

  const response = event.response as { output?: Array<Record<string, unknown>> } | undefined;
  return (response?.output ?? []).filter(
    (item) => item.type === "function_call" && item.name === "control_browser" && typeof item.call_id === "string"
  );
}

function isWeakSummary(summary: string | null) {
  if (!summary) {
    return true;
  }

  return /without fully confirming|latest source of truth|still settling|not returned/i.test(summary);
}

async function handleBrowserFunctionCall(sideband: RealtimeSidebandSession, item: Record<string, unknown>) {
  const callId = String(item.call_id);
  if (sideband.processedCalls.has(callId)) {
    return;
  }

  sideband.processedCalls.add(callId);

  const args = parseFunctionArguments(item.arguments);
  const instruction = typeof args.instruction === "string" ? args.instruction.trim() : "";
  if (!instruction) {
    sendRealtimeEvent(sideband.ws, {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({ ok: false, error: "Missing browser instruction." })
      }
    });
    sendRealtimeEvent(sideband.ws, { type: "response.create" });
    return;
  }

  try {
    const acceptedSnapshot = await runDemoInstruction({
      demoId: sideband.demoId,
      instruction,
      interrupt: args.interrupt === true
    });
    const settledSnapshot = await waitForDemoRunToSettle({
      demoId: sideband.demoId,
      runId: acceptedSnapshot.activeRunId
    });
    const readableContext = getDemoReadableContext(sideband.demoId);
    const summary = isWeakSummary(settledSnapshot.lastSummary) ? null : settledSnapshot.lastSummary;

    sendRealtimeEvent(sideband.ws, {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({
          ok: true,
          accepted: true,
          completed: !settledSnapshot.busy,
          runId: acceptedSnapshot.activeRunId,
          status: settledSnapshot.status,
          currentStep: settledSnapshot.currentStep,
          summary,
          error: settledSnapshot.error,
          currentUrl: settledSnapshot.currentUrl,
          pageTitle: settledSnapshot.pageTitle,
          liveViewUrl: settledSnapshot.liveViewUrl,
          readableContext
        })
      }
    });

    sendRealtimeEvent(sideband.ws, {
      type: "response.create",
      response: {
        instructions:
          "Use the function output as the ONLY source of truth. If summary is present, answer from it. If summary is missing but readableContext.pageTextExcerpt or readableContext.snapshotExcerpt is present, answer the user's read/describe question from that context. Do not add any fact, number, or name from your own knowledge — only state what is in the function output. If the summary says the information could not be found on the page, relay that honestly and do not guess. Do not say the browser controller has not returned what is on screen when readableContext is present. Keep the answer concise."
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser controller request failed.";
    sendRealtimeEvent(sideband.ws, {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify({ ok: false, error: message })
      }
    });
    sendRealtimeEvent(sideband.ws, { type: "response.create" });
  }
}

export function attachRealtimeSideband({ callId, demoId }: { callId: string; demoId: string }) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const existing = getSidebands().get(callId);
  if (existing) {
    return existing;
  }

  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  const sideband: RealtimeSidebandSession = {
    callId,
    demoId,
    ws,
    processedCalls: new Set()
  };

  getSidebands().set(callId, sideband);

  ws.on("open", () => {
    sendRealtimeEvent(ws, {
      type: "session.update",
      session: buildRealtimeSessionConfig()
    });
  });

  ws.on("message", (message) => {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(message.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

    for (const item of getFunctionCalls(event)) {
      void handleBrowserFunctionCall(sideband, item);
    }
  });

  ws.on("close", () => {
    getSidebands().delete(callId);
  });

  return sideband;
}
