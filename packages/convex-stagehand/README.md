# convex-stagehand

AI-powered browser automation for Convex applications. Extract data, perform actions, and automate workflows using natural language - no Playwright knowledge required.

## Features

- **Simple API** - Describe what you want in plain English
- **Type-safe** - Full TypeScript support with Zod schemas
- **Session management** - Reuse browser sessions across multiple operations
- **Agent mode** - Autonomous multi-step task execution
- **Powered by Stagehand** - Uses the [Stagehand](https://github.com/browserbase/stagehand) REST API

## Quick Start

### 1. Install the Component

```bash
npm install @browserbasehq/convex-stagehand zod
```

### 2. Configure Convex

Add the component to your `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import stagehand from "convex-stagehand/convex.config";

const app = defineApp();
app.use(stagehand, { name: "stagehand" });

export default app;
```

### 3. Set Up Environment Variables

Add these to your [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `BROWSERBASE_API_KEY` | Your Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | Your Browserbase project ID |
| `MODEL_API_KEY` | Your LLM provider API key (OpenAI, Anthropic, etc.) |

### 4. Use the Component

```typescript
import { action } from "./_generated/server";
import { Stagehand } from "convex-stagehand";
import { components } from "./_generated/api";
import { z } from "zod";

const stagehand = new Stagehand(components.stagehand, {
  browserbaseApiKey: process.env.BROWSERBASE_API_KEY!,
  browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID!,
  modelApiKey: process.env.MODEL_API_KEY!,
});

export const scrapeHackerNews = action({
  handler: async (ctx) => {
    return await stagehand.extract(ctx, {
      url: "https://news.ycombinator.com",
      instruction: "Extract the top 5 stories with title, score, and link",
      schema: z.object({
        stories: z.array(z.object({
          title: z.string(),
          score: z.string(),
          link: z.string(),
        }))
      })
    });
  }
});
```

## API Reference

### `startSession(ctx, args)`

Start a new browser session. Returns session info for use with other operations.

```typescript
const session = await stagehand.startSession(ctx, {
  url: "https://example.com",
  browserbaseSessionID: "optional-existing-session-id",
  options: {
    timeout: 30000,
    waitUntil: "networkidle",
    domSettleTimeoutMs: 2000,
    selfHeal: true,
    systemPrompt: "Custom system prompt for the session",
  }
});
// { sessionId: "...", cdpUrl: "wss://..." }
```

**Parameters:**
- `url` - The URL to navigate to
- `browserbaseSessionID` - Optional: Resume an existing Browserbase session
- `options.timeout` - Navigation timeout in milliseconds
- `options.waitUntil` - When to consider navigation complete: `"load"`, `"domcontentloaded"`, or `"networkidle"`
- `options.domSettleTimeoutMs` - Timeout for DOM to settle before considering page loaded
- `options.selfHeal` - Enable self-healing capabilities for more robust automation
- `options.systemPrompt` - Custom system prompt to guide the AI's behavior during the session

**Returns:**
```typescript
{
  sessionId: string; // Use with other operations
  cdpUrl?: string;   // For advanced Playwright/Puppeteer usage
}
```

---

### `endSession(ctx, args)`

End a browser session.

```typescript
await stagehand.endSession(ctx, { sessionId: session.sessionId });
```

**Parameters:**
- `sessionId` - The session to end

**Returns:** `{ success: boolean }`

---

### `extract(ctx, args)`

Extract structured data from a web page using AI.

```typescript
// Without session (creates and destroys its own)
const data = await stagehand.extract(ctx, {
  url: "https://example.com",
  instruction: "Extract all product names and prices",
  schema: z.object({
    products: z.array(z.object({
      name: z.string(),
      price: z.string(),
    }))
  }),
});

// With existing session (reuses session, doesn't end it)
const data = await stagehand.extract(ctx, {
  sessionId: session.sessionId,
  instruction: "Extract all product names and prices",
  schema: z.object({ ... }),
});
```

**Parameters:**
- `sessionId` - Optional: Use an existing session
- `url` - The URL to navigate to (required if no sessionId)
- `instruction` - Natural language description of what to extract
- `schema` - Zod schema defining the expected output structure
- `options.timeout` - Navigation timeout in milliseconds
- `options.waitUntil` - When to consider navigation complete: `"load"`, `"domcontentloaded"`, or `"networkidle"`

**Returns:** Data matching your Zod schema

---

### `act(ctx, args)`

Execute browser actions using natural language.

```typescript
// Without session
const result = await stagehand.act(ctx, {
  url: "https://example.com/login",
  action: "Click the login button and wait for the page to load",
});

// With existing session
const result = await stagehand.act(ctx, {
  sessionId: session.sessionId,
  action: "Fill in the email field with 'user@example.com'",
});
```

**Parameters:**
- `sessionId` - Optional: Use an existing session
- `url` - The URL to navigate to (required if no sessionId)
- `action` - Natural language description of the action to perform
- `options.timeout` - Navigation timeout in milliseconds
- `options.waitUntil` - When to consider navigation complete

**Returns:**
```typescript
{
  success: boolean;
  message: string;
  actionDescription: string;
}
```

---

### `observe(ctx, args)`

Find available actions on a web page.

```typescript
const actions = await stagehand.observe(ctx, {
  url: "https://example.com",
  instruction: "Find all clickable navigation links",
});
// [{ description: "Home link", selector: "a.nav-home", method: "click" }, ...]
```

**Parameters:**
- `sessionId` - Optional: Use an existing session
- `url` - The URL to navigate to (required if no sessionId)
- `instruction` - Natural language description of what actions to find
- `options.timeout` - Navigation timeout in milliseconds
- `options.waitUntil` - When to consider navigation complete

**Returns:**
```typescript
Array<{
  description: string;
  selector: string;
  method: string;
  arguments?: string[];
}>
```

---

### `agent(ctx, args)`

Execute autonomous multi-step browser automation using an AI agent. The agent interprets the instruction and decides what actions to take.

```typescript
// Agent creates its own session
const result = await stagehand.agent(ctx, {
  url: "https://google.com",
  instruction: "Search for 'convex database' and extract the top 3 results with title and URL",
  options: { maxSteps: 10 },
});

// Agent with existing session
const result = await stagehand.agent(ctx, {
  sessionId: session.sessionId,
  instruction: "Fill out the contact form and submit",
  options: { maxSteps: 5 },
});
```

**Parameters:**
- `sessionId` - Optional: Use an existing session
- `url` - The URL to navigate to (required if no sessionId)
- `instruction` - Natural language description of the task to complete
- `options.cua` - Enable Computer Use Agent mode
- `options.maxSteps` - Maximum steps the agent can take
- `options.systemPrompt` - Custom system prompt for the agent
- `options.timeout` - Navigation timeout in milliseconds
- `options.waitUntil` - When to consider navigation complete

**Returns:**
```typescript
{
  actions: Array<{
    type: string;
    action?: string;
    reasoning?: string;
    timeMs?: number;
  }>;
  completed: boolean;
  message: string;
  success: boolean;
}
```

## Examples

### Simple extraction (automatic session)

```typescript
const news = await stagehand.extract(ctx, {
  url: "https://news.ycombinator.com",
  instruction: "Get the top 10 stories with title, points, and comment count",
  schema: z.object({
    stories: z.array(z.object({
      title: z.string(),
      points: z.string(),
      comments: z.string(),
    }))
  })
});
```

### Manual session management

Use session management when you need to perform multiple operations while preserving browser state (cookies, login, etc.):

```typescript
// Start a session
const session = await stagehand.startSession(ctx, {
  url: "https://google.com"
});

// Perform multiple operations in the same session
await stagehand.act(ctx, {
  sessionId: session.sessionId,
  action: "Search for 'convex database'"
});

const data = await stagehand.extract(ctx, {
  sessionId: session.sessionId,
  instruction: "Extract the top 3 results",
  schema: z.object({
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
    }))
  })
});

// End the session when done
await stagehand.endSession(ctx, { sessionId: session.sessionId });
```

### Autonomous agent

Let the AI agent figure out how to complete a complex task:

```typescript
const result = await stagehand.agent(ctx, {
  url: "https://www.google.com",
  instruction: "Search for 'best pizza in NYC', click on the first result, and extract the restaurant name and address",
  options: { maxSteps: 10 }
});

console.log(result.message); // Summary of what the agent did
console.log(result.actions); // Detailed log of each action taken
```

### Resume session across Convex actions

Store the `sessionId` to continue working with the same Stagehand session across different Convex action calls:

```typescript
// Action 1: Start session and return sessionId
export const startBrowsing = action({
  handler: async (ctx) => {
    const session = await stagehand.startSession(ctx, {
      url: "https://example.com/login"
    });
    // Store sessionId in your database
    return session.sessionId;
  }
});

// Action 2: Continue same session later
export const continueBrowsing = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    await stagehand.act(ctx, {
      sessionId: args.sessionId,
      action: "Navigate to the dashboard page",
    });

    return await stagehand.extract(ctx, {
      sessionId: args.sessionId,
      instruction: "Extract user data",
      schema: z.object({ ... }),
    });
  }
});
```

## Configuration Options

### AI Model

By default, the component uses `openai/gpt-4o`. You can use any model supported by the [Vercel AI SDK](https://sdk.vercel.ai/providers/ai-sdk-providers) that supports structured outputs:

```typescript
const stagehand = new Stagehand(components.stagehand, {
  browserbaseApiKey: process.env.BROWSERBASE_API_KEY!,
  browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID!,
  modelApiKey: process.env.ANTHROPIC_API_KEY!, // Use Anthropic
  modelName: "anthropic/claude-3-5-sonnet-20241022",
});
```

For the full list of supported models and providers, see the [Stagehand Models documentation](https://docs.stagehand.dev/configuration/models).

## Requirements

- [Browserbase](https://browserbase.com) account and API key
- LLM provider API key (see [supported models](https://docs.stagehand.dev/configuration/models))
- Convex 1.29.3 or later

## How It Works

This component uses the [Stagehand REST API](https://stagehand.stldocs.app/api) to power browser automation. Each operation:

1. Starts a cloud browser session via Browserbase (or reuses an existing one)
2. Navigates to the target URL
3. Uses AI to understand the page and perform the requested operation
4. Optionally ends the session and returns results

With session management, you control when sessions start and end, allowing you to maintain browser state across multiple operations.

## Development

### Component Structure

The component exposes its API through Convex's component system. All functions are in a single `lib.ts` module:

```
component.lib.<function>
```

For example:
- `component.lib.startSession` - Start a browser session
- `component.lib.endSession` - End a browser session
- `component.lib.extract` - Extract data from web pages
- `component.lib.act` - Perform browser actions
- `component.lib.observe` - Find interactive elements
- `component.lib.agent` - Autonomous multi-step automation

The `Stagehand` client class wraps these internal paths to provide a clean user API:

```typescript
// User calls:
stagehand.extract(ctx, {...})

// Internally calls:
ctx.runAction(component.lib.extract, {...})
```

### Building the Component

To build the component locally:

```bash
# Install dependencies
npm install

# Build with Convex codegen (generates component API)
npm run build:codegen

# Or just build TypeScript
npm run build:esm
```

The component requires a Convex deployment to generate proper component API types (`_generated/component.ts`).

### Example App

Check out the full example app in the [`example/`](./example) directory:

```bash
git clone https://github.com/browserbase/integrations
cd integrations/packages/convex-stagehand/example
npm install
npm run dev
```

The example includes:
- HackerNews story extraction with AI
- Type-safe data extraction using Zod schemas
- Database persistence with Convex
- Real-time updates and automatic refresh

## License

MIT
