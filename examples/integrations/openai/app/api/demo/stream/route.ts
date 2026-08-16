import { getDemoSnapshot, subscribeToDemo } from "../../../../lib/demo-controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const demoId = url.searchParams.get("demoId");

  if (!demoId) {
    return new Response("Missing demoId.", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendSnapshot = (snapshot = getDemoSnapshot(demoId)) => {
        controller.enqueue(
          encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)
        );
      };

      sendSnapshot();

      const unsubscribe = subscribeToDemo(demoId, (snapshot) => {
        sendSnapshot(snapshot);
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream"
    }
  });
}
