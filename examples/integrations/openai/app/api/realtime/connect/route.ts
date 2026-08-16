import { NextResponse } from "next/server";
import { attachRealtimeSideband } from "../../../../lib/openai-realtime-sideband";
import { buildRealtimeSessionConfig } from "../../../../lib/realtime-config";

export const runtime = "nodejs";

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY ?? process.env.openai_key ?? null;
}

export async function POST(request: Request) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
  }

  const url = new URL(request.url);
  const demoId = url.searchParams.get("demoId");
  if (!demoId) {
    return NextResponse.json({ error: "Missing demoId." }, { status: 400 });
  }

  const sdp = await request.text();
  if (!sdp.trim()) {
    return NextResponse.json({ error: "Missing SDP offer." }, { status: 400 });
  }

  const formData = new FormData();
  formData.set("sdp", sdp);
  formData.set("session", JSON.stringify(buildRealtimeSessionConfig()));

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const answerSdp = await response.text();
  if (!response.ok) {
    return new Response(answerSdp || "Failed to create Realtime call.", { status: response.status });
  }

  const location = response.headers.get("Location");
  const callId = location?.split("/").pop() ?? null;
  if (callId) {
    attachRealtimeSideband({ callId, demoId });
  }

  return new Response(answerSdp, {
    headers: {
      "Content-Type": "application/sdp",
      ...(callId ? { "X-OpenAI-Call-Id": callId } : {})
    }
  });
}
