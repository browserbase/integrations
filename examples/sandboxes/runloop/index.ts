/**
 * Reach any website from a Runloop devbox via a Verified Browserbase browser.
 *
 * A Runloop devbox is great at running your agent loop — but a vanilla
 * Firecracker devbox can't browse the real web reliably. It has a datacenter IP
 * (instantly blocked by Cloudflare / Akamai / DataDome), no anti-bot fingerprint
 * hardening, and no way to solve a CAPTCHA. Bundling Playwright + Chromium into
 * the image still browses *from the datacenter IP*, so the hard sites stay blocked.
 *
 * This example keeps the browser OUT of the devbox. The devbox runs the `browse`
 * (Browserbase) CLI, which connects out over CDP to a Verified Browserbase
 * browser that uses a residential IP, passes bot-detection fingerprinting, and
 * auto-solves CAPTCHAs server-side.
 *
 *   Runloop devbox (node + `browse` CLI)  --CDP over wss-->  Browserbase Verified browser
 *
 * Usage:
 *   npm run create-blueprint                 build the reusable devbox image once
 *   npm run start -- run [--target-url URL]  create a devbox + run the demo
 *
 * Env: RUNLOOP_API_KEY, BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Runloop from "@runloop/api-client";

const BLUEPRINT_NAME = "browsecli-browserbase";
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_SCRIPT = readFileSync(join(HERE, "browsecli-demo.sh"), "utf8");
const BLUEPRINT_DOCKERFILE = readFileSync(join(HERE, "blueprint.Dockerfile"), "utf8");

function client(): Runloop {
  const bearerToken = process.env.RUNLOOP_API_KEY;
  if (!bearerToken) {
    console.error("RUNLOOP_API_KEY is not set (get one at platform.runloop.ai)");
    process.exit(1);
  }
  return new Runloop({ bearerToken });
}

/** Build (or reuse) the Blueprint: node + `browse` CLI, no Chrome. */
async function createBlueprint(): Promise<string> {
  const rl = client();
  console.log(`[runloop] building blueprint '${BLUEPRINT_NAME}' (node + browse CLI)...`);
  const blueprint = await rl.blueprints.createAndAwaitBuildComplete({
    name: BLUEPRINT_NAME,
    dockerfile: BLUEPRINT_DOCKERFILE,
    // Bake the demo script in so the Dockerfile's COPY succeeds at build time.
    file_mounts: { "/app/browsecli-demo.sh": DEMO_SCRIPT },
  });
  console.log(`[runloop] blueprint ready: ${blueprint.id}`);
  return blueprint.id;
}

/** Create a devbox from the blueprint and run the Browserbase demo inside it. */
async function run(targetUrl: string): Promise<number> {
  const rl = client();

  const bbKey = process.env.BROWSERBASE_API_KEY;
  if (!bbKey) {
    console.error("BROWSERBASE_API_KEY is not set (get one at browserbase.com)");
    process.exit(1);
  }

  const environment_variables: Record<string, string> = {
    BROWSERBASE_API_KEY: bbKey,
    BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID ?? "",
    TARGET_URL: targetUrl,
  };

  console.log(`[runloop] creating devbox from blueprint '${BLUEPRINT_NAME}'...`);
  const devbox = await rl.devboxes.createAndAwaitRunning({
    blueprint_name: BLUEPRINT_NAME,
    environment_variables,
    name: "browsecli-browserbase-demo",
  });
  console.log(`[runloop] devbox running: ${devbox.id}`);

  try {
    console.log(`[runloop] reaching protected target via Browserbase: ${targetUrl}`);
    const result = await rl.devboxes.executeSync(devbox.id, {
      command: "bash /app/browsecli-demo.sh",
    });
    // DevboxExecutionDetailView: stdout, stderr, exit_status
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return result.exit_status ?? 0;
  } finally {
    console.log(`[runloop] shutting down devbox ${devbox.id}`);
    await rl.devboxes.shutdown(devbox.id);
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "create-blueprint") {
    await createBlueprint();
    return;
  }
  if (cmd === "run" || cmd === undefined) {
    const idx = rest.indexOf("--target-url");
    const targetUrl = idx >= 0 ? rest[idx + 1] : "https://nowsecure.nl";
    const code = await run(targetUrl);
    if (code !== 0) process.exit(code);
    console.log("[runloop] done");
    return;
  }
  console.error(`unknown command: ${cmd} (use 'create-blueprint' or 'run')`);
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
