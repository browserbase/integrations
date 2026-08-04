import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

if (!process.env.BROWSERBASE_API_KEY) {
  throw new Error('BROWSERBASE_API_KEY is required for the live smoke test.');
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('../dist/cli.js', import.meta.url))],
  env: Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined)
  ),
});
const client = new Client({
  name: 'stagehand-codemode-live-smoke',
  version: '0.0.0',
});

try {
  await client.connect(transport);
  const discovered = await client.listTools();
  assert.deepEqual(
    discovered.tools.map(tool => tool.name),
    ['code_execute']
  );

  const first = structured(
    await client.callTool({
      name: 'code_execute',
      arguments: {
        code: `
          await page.goto("https://browserbase.github.io/stagehand-eval-sites/sites/new-tab/", {
            waitUntil: "load",
          });
          return {
            phase: "opened",
            title: await page.title(),
            url: await page.url(),
            pageCount: (await context.pages()).length,
          };
        `,
      },
    })
  );
  assert.equal(first.ok, true, JSON.stringify(first));

  const second = structured(
    await client.callTool({
      name: 'code_execute',
      arguments: {
        code: `
          return {
            phase: "reused",
            title: await page.title(),
            url: await page.url(),
            bodyIncludesWelcome: (await page.locator("body").innerText()).includes("Welcome"),
            pageCount: (await context.pages()).length,
          };
        `,
      },
    })
  );
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(first.value.url, second.value.url);
  assert.equal(second.value.bodyIncludesWelcome, true);
  assert.equal(first.value.pageCount, 1);
  assert.equal(second.value.pageCount, 1);

  const third = structured(
    await client.callTool({
      name: 'code_execute',
      arguments: {
        code: `
          return {
            phase: "stagehand-syntax",
            actType: typeof stagehand.act,
            observeType: typeof stagehand.observe,
            extractType: typeof stagehand.extract,
            zObjectType: typeof z.object,
          };
        `,
      },
    })
  );
  assert.equal(third.ok, true, JSON.stringify(third));
  assert.deepEqual(third.value, {
    phase: 'stagehand-syntax',
    actType: 'function',
    observeType: 'function',
    extractType: 'function',
    zObjectType: 'function',
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'PASS',
        transport: 'local stdio MCP',
        discoveredTools: ['code_execute'],
        lazyBrowserCreated: true,
        browserStateReused: true,
        stagehandSyntaxAvailable: true,
        first: first.value,
        second: second.value,
        third: third.value,
      },
      null,
      2
    )}\n`
  );
} finally {
  await client.close();
}

function structured(result) {
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find(block => block.type === 'text')?.text;
  if (!text)
    throw new Error('code_execute returned no structured or text result.');
  return JSON.parse(text);
}
