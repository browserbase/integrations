/**
 * src/index.ts — Cloudflare Worker that runs the BrowseCLI inside a Cloudflare
 * Container (Sandbox SDK) to reach any site through a Verified Browserbase
 * browser (residential IP, no datacenter blocking, auto CAPTCHA-solve).
 *
 * Why a Container and not just a Worker?
 *   `browse` is a Node CLI: it needs a real process, a filesystem, and outbound
 *   CDP sockets. A Worker isolate has none of those. So the Worker delegates to a
 *   Cloudflare *Container* (a Durable-Object-backed sandbox from
 *   `@cloudflare/sandbox`) built from ./Dockerfile, and drives the CLI inside it.
 *
 * Why Browserbase and not Cloudflare Browser Run?
 *   The container does NOT run a browser. Chrome lives on Browserbase and is
 *   reached over CDP. That gives a residential/verified IP, anti-bot
 *   fingerprint hardening, and server-side CAPTCHA solving — none of which
 *   Cloudflare Browser Run offers. This is the differentiator: reaching sites
 *   that block datacenter IPs / challenge automation.
 *
 *   Worker ──▶ Container (node + `browse`) ──CDP/wss──▶ Browserbase Verified browser
 *
 * Request:  GET|POST /            → run the demo, stream stdout/stderr back
 *           POST /  {"targetUrl"} → override the protected site to visit
 * Secrets:  BROWSERBASE_API_KEY  (wrangler secret put ...)
 */
import { getSandbox, proxyToSandbox, type Sandbox } from "@cloudflare/sandbox";

// Re-export the Sandbox Durable Object class so wrangler can bind it (see the
// `durable_objects` + `containers` blocks in wrangler.jsonc). The actual
// container behavior is defined by ./Dockerfile.
export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  // Durable Object namespace backing the container sandbox.
  Sandbox: DurableObjectNamespace<Sandbox>;
  // Browserbase credentials — set with:
  //   wrangler secret put BROWSERBASE_API_KEY
  BROWSERBASE_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // The Sandbox SDK can expose ports inside the container directly; forward
    // any such routed request first. (No-op for this demo, but kept so the
    // template matches the canonical @cloudflare/sandbox shape.)
    const proxied = await proxyToSandbox(request, env);
    if (proxied) return proxied;

    if (!env.BROWSERBASE_API_KEY) {
      return new Response(
        "Missing BROWSERBASE_API_KEY.\n" +
          "Set it with: wrangler secret put BROWSERBASE_API_KEY\n",
        { status: 500 },
      );
    }

    // Optional target override via POST body { "targetUrl": "https://..." }.
    let targetUrl: string | undefined;
    if (request.method === "POST") {
      try {
        const body = (await request.json()) as { targetUrl?: unknown };
        if (typeof body?.targetUrl === "string") targetUrl = body.targetUrl;
      } catch {
        // no/invalid body → use the demo's default target
      }
    }

    // One sandbox (container instance) per logical session id. Reuse the same id
    // to reuse a warm container; use a fresh id for full isolation.
    const sandbox = getSandbox(env.Sandbox, "browsecli-demo");

    try {
      // The demo script is COPY'd into the image at /app/browsecli-demo.sh by
      // ./Dockerfile, so no upload is needed. Run it with the Browserbase
      // credentials (and optional target) injected as env vars.
      const result = await sandbox.exec("/app/browsecli-demo.sh", {
        env: {
          BROWSERBASE_API_KEY: env.BROWSERBASE_API_KEY,
          ...(targetUrl ? { TARGET_URL: targetUrl } : {}),
        },
      });

      // ExecResult: { success, exitCode, stdout, stderr, command, duration, ... }
      const ok = result.success;
      const out =
        `${result.stdout ?? ""}${result.stderr ?? ""}\n[exit ${result.exitCode}]\n`;
      return new Response(out, {
        status: ok ? 200 : 502,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.stack ?? err.message : String(err);
      return new Response(`Sandbox error:\n${msg}\n`, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  },
};
