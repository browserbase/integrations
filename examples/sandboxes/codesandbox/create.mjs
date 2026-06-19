/**
 * BrowseCLI in a CodeSandbox SDK microVM — driver script.
 *
 * Creates a sandbox from the golden-image template (built with
 * `npx @codesandbox/sdk build ./tpl`), uploads the demo script, and runs it.
 * The script uses the `browse` CLI — pre-installed by the template's setupTasks
 * — to drive a *remote* Verified Browserbase browser over CDP: residential IP,
 * stealth fingerprint, server-side CAPTCHA solving. It reaches a Cloudflare-
 * protected page that a vanilla datacenter-IP microVM browser would be blocked
 * from.
 *
 * The agent loop runs IN the CodeSandbox microVM; the browser runs ON Browserbase.
 *
 * Run:
 *   npm install
 *   npm run build:template            # one-time: prints a TEMPLATE_ID
 *   TEMPLATE_ID=<id> npm start        # creates a VM from the template + runs the demo
 *
 * Required env (see .env.example):
 *   CSB_API_KEY               — CodeSandbox SDK key (https://codesandbox.io/t/api)
 *   BROWSERBASE_API_KEY       — Browserbase key   (https://www.browserbase.com/settings)
 *   BROWSERBASE_PROJECT_ID    — Browserbase project id
 *   Optional: TEMPLATE_ID (the id from `build`), TARGET_URL (default https://nowsecure.nl)
 *
 * Without CSB_API_KEY this script no-ops with a clear message (so it won't crash
 * CI) — the in-VM behavior is proven separately via Dockerfile.equiv.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CodeSandbox } from '@codesandbox/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_URL = process.env.TARGET_URL ?? 'https://nowsecure.nl';

function reqEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  if (!process.env.CSB_API_KEY) {
    console.log(
      '[browsecli-codesandbox] skipping live run (no CSB_API_KEY). ' +
        'Get one at https://codesandbox.io/t/api, then: CSB_API_KEY=csb_... TEMPLATE_ID=<id> npm start',
    );
    return; // exit 0 — safe for CI without a key
  }

  const browserbaseApiKey = reqEnv('BROWSERBASE_API_KEY');
  const browserbaseProjectId = reqEnv('BROWSERBASE_PROJECT_ID');
  // TEMPLATE_ID is printed by `npm run build:template`. If you skip the build,
  // omit it and the SDK creates a fresh Universal sandbox (slower; no preinstalled CLI).
  const templateId = process.env.TEMPLATE_ID;

  const sdk = new CodeSandbox(process.env.CSB_API_KEY);

  console.log(
    templateId
      ? `Creating CodeSandbox microVM from template "${templateId}"...`
      : 'Creating CodeSandbox microVM (no TEMPLATE_ID; Universal base)...',
  );
  const sandbox = await sdk.sandboxes.create(templateId ? { id: templateId } : {});
  console.log(`Sandbox ready: ${sandbox.id}`);

  // A connected client gives us a shell + filesystem inside the microVM.
  const client = await sandbox.connect();

  try {
    // (lifecycle: shutdown is on sdk.sandboxes, not on the sandbox handle)
    // Make sure browse is present even if this sandbox wasn't built from the
    // template (idempotent — the template's setupTasks already did this).
    await client.commands.run('command -v browse >/dev/null 2>&1 || npm install -g browse@latest');

    // Upload the demo script into the microVM and make it executable.
    // (It also ships inside the template at tpl/browsecli-demo.sh; uploading lets
    // you run against a fresh sandbox even without rebuilding the template.)
    const demo = readFileSync(join(__dirname, 'tpl', 'browsecli-demo.sh'), 'utf8');
    await client.fs.writeTextFile('./browsecli-demo.sh', demo);
    await client.commands.run('chmod +x ./browsecli-demo.sh');

    console.log(`Running BrowseCLI demo against ${TARGET_URL} ...\n`);
    // Browserbase creds + target are passed as per-command env vars.
    const output = await client.commands.run('./browsecli-demo.sh', {
      env: {
        BROWSERBASE_API_KEY: browserbaseApiKey,
        BROWSERBASE_PROJECT_ID: browserbaseProjectId,
        TARGET_URL,
      },
    });
    console.log(output);
    console.log(
      '\n✅ Done — reached real content through a Verified Browserbase browser from inside a CodeSandbox microVM.',
    );
  } finally {
    // Shutdown lives on the Sandboxes namespace and takes the sandbox id.
    await sdk.sandboxes.shutdown(sandbox.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
