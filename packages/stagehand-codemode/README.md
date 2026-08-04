# Stagehand Code Mode

Stagehand Code Mode gives an agent one `code_execute` tool for operating a Browserbase browser with
Stagehand V4 JavaScript. It is framework-neutral: agent frameworks can launch the included local
MCP server over stdio or wrap `StagehandCodeExecutor` in a native tool binding.

The executor creates a Browserbase browser on the first valid call, serializes calls, and reuses the
same browser until its owner closes it. This lets an agent complete multi-step tasks across tool calls
without managing a browser or session identifier.

## Tool contract

`code_execute` accepts the body of an async JavaScript function:

```ts
type CodeExecuteInput = {
  code: string;
};
```

The generated function receives these objects:

- `page`: the active Stagehand V4 `Page`;
- `context`: the shared Stagehand V4 `BrowserContext`;
- `stagehand`: the Stagehand V4 `act`, `observe`, and `extract` methods;
- `z`: Zod V4 for structured extraction schemas; and
- `console`: captured `log`, `warn`, and `error` methods.

For example:

```js
await page.goto('https://example.com', { waitUntil: 'load' });
return {
  title: await page.title(),
  url: await page.url(),
};
```

Calls return a JSON-safe result containing the active page state, the generated function's return
value, and any captured logs:

```ts
type CodeExecuteResult =
  | {
      ok: true;
      page: { url: string; title: string };
      value?: unknown;
      logs?: Array<{ level: 'log' | 'warn' | 'error'; text: string }>;
    }
  | {
      ok: false;
      page?: { url: string; title: string };
      logs?: Array<{ level: 'log' | 'warn' | 'error'; text: string }>;
      error: {
        kind: 'validation' | 'runtime' | 'aborted' | 'closed';
        name: string;
        message: string;
      };
    };
```

## Local MCP integration

Frameworks with local-process MCP support should launch the built stdio server and keep that process
alive for the complete agent run:

```text
node packages/stagehand-codemode/dist/stdio-server.js
```

The stdio server is an internal process entrypoint, not a user-facing CLI. The package does not
publish a `bin` command or accept command-line arguments.

The framework owns the process lifecycle:

1. Launch one stdio server for the agent run.
2. Reuse it for every `code_execute` call that should share browser state.
3. Terminate and relaunch it if a call stops responding.
4. Close it when the agent run finishes.

Restarting the process creates a new browser, so browser state from the previous process is not
preserved.

## Native tool integration

Frameworks that do not launch local MCP servers can wrap the executor directly:

```ts
import {
  StagehandCodeExecutor,
  stagehandCodeConfigFromEnv,
} from '@browserbasehq/stagehand-codemode';

const executor = new StagehandCodeExecutor(stagehandCodeConfigFromEnv());

try {
  const result = await executor.execute({
    code: `
      await page.goto("https://example.com", { waitUntil: "load" });
      return { title: await page.title() };
    `,
  });
  console.log(result);
} finally {
  await executor.close();
}
```

Create one executor per agent run and close it in `finally` so the Browserbase browser is released
when the run succeeds, fails, or is cancelled.

## Configuration

Stagehand Code Mode reads configuration from the owning framework's environment:

| Variable                                                              | Required                                  | Purpose                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `BROWSERBASE_API_KEY`                                                 | Yes, before the first `code_execute` call | Creates the Browserbase browser                                             |
| `STAGEHAND_MODEL_NAME`                                                | Only for Stagehand AI methods             | Provider and model name used by `act`, `observe`, and `extract`             |
| `STAGEHAND_MODEL_API_KEY`                                             | Provider-dependent                        | Explicit model-provider API key                                             |
| `STAGEHAND_MODEL_BASE_URL`                                            | No                                        | Custom model-provider base URL                                              |
| `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` | No                                        | Selects `google/gemini-2.5-flash-lite` when no explicit model is configured |

The consuming application must also make a compatible `@browserbasehq/stagehand` V4 package
available to the executor.

## Model syntax guide

[`SKILL.md`](./SKILL.md) is the canonical Stagehand V4 syntax guide. The MCP server includes the
complete guide in the `code_execute` tool description. Native integrations should also add the
exported `STAGEHAND_CODEMODE_SKILL` string to the agent's system instructions or equivalent
high-priority context.

The guide covers deterministic page and locator methods, `act`, `observe`, `extract`, Zod schemas,
multiple pages, cross-call state, and return-value discipline.

## Lifecycle and limits

- Browser creation is lazy; MCP discovery does not create a Browserbase browser.
- Calls are serialized because they operate on one shared browser context.
- Pages, cookies, and navigation state persist across successful calls in the same process.
- JavaScript variables declared inside generated code do not persist between calls.
- Input code is limited to 100,000 UTF-8 bytes.
- Captured logs are limited to 64 KiB.
- Returned values are limited to 256 KiB and are truncated with metadata when necessary.
- BigInt and byte-array values are converted into JSON-safe representations.

## Security

Generated JavaScript runs directly in the MCP or native-tool process. Stagehand Code Mode is not a
security sandbox: generated code can access the filesystem, network, environment variables, Node
globals, and in-process SDK state available to that process.

Use Stagehand Code Mode only with trusted agents in a trusted execution environment. Applications
that execute untrusted code must provide a real isolation boundary, such as a restricted container,
virtual machine, or purpose-built code sandbox.
