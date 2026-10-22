# Browserbase + Human Pages

When your Browserbase agent hits something it can't automate — CAPTCHAs, identity verification, phone checks — delegate to a real human via Human Pages and resume once they're done.

## How it works

```
Browserbase agent → detects blocker → searches Human Pages for a human
→ creates job offer → human completes the step → agent resumes
```

## Quick start

```bash
npm install @browserbasehq/stagehand humanpages
```

```env
BROWSERBASE_API_KEY=your_key
BROWSERBASE_PROJECT_ID=your_project
HUMANPAGES_API_KEY=hp_your_key
```

## Example: human fallback

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({ env: "BROWSERBASE" });
await stagehand.init();
const page = stagehand.context.pages()[0];

await page.goto("https://example.com/signup");
await stagehand.act({ action: 'Fill in email with "agent@example.com"' });

// Check for blockers
const blockers = await stagehand.extract({
  instruction: "Is there a CAPTCHA, phone verification, or identity check?",
  schema: {
    type: "object",
    properties: {
      hasBlocker: { type: "boolean" },
      blockerType: { type: "string" },
    },
    required: ["hasBlocker"],
  },
});

if (blockers.hasBlocker) {
  const API_KEY = process.env.HUMANPAGES_API_KEY;
  const headers = {
    "Content-Type": "application/json",
    "X-Agent-Key": API_KEY,
  };

  // Find a human
  const search = await fetch(
    "https://humanpages.ai/api/humans/search?skill=web+task&available=true",
    { headers }
  );
  const { results } = await search.json();

  // Create job
  const job = await fetch("https://humanpages.ai/api/jobs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      humanId: results[0].id,
      title: `Complete ${blockers.blockerType} on signup page`,
      description: `Session: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}\nPlease complete the ${blockers.blockerType} step.`,
      priceUsdc: "5.00",
      deadlineHours: 1,
    }),
  });
  const { job: created } = await job.json();

  // Wait for human to finish
  let status = "PENDING";
  while (!["SUBMITTED", "COMPLETED"].includes(status)) {
    await new Promise((r) => setTimeout(r, 30_000));
    const resp = await fetch(`https://humanpages.ai/api/jobs/${created.id}`, {
      headers,
    });
    const data = await resp.json();
    status = data.job.status;
  }

  // Resume automation
  await page.reload();
}

await stagehand.act({ action: "Click the submit button" });
await stagehand.close();
```

## Links

- [Human Pages](https://humanpages.ai)
- [Developer docs](https://humanpages.ai/dev)
- [MCP Server (npm)](https://www.npmjs.com/package/humanpages)
- [Full integration repo](https://github.com/human-pages-ai/browserbase-humanpages)
