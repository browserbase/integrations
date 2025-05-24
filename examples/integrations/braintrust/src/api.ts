import * as braintrust from "braintrust";
import { z } from "zod";
import { chromium } from "playwright-core";

// Create a session with Browserbase
async function createSession() {
  const response = await fetch(`https://api.browserbase.com/v1/sessions`, {
    method: "POST",
    headers: {
      "x-bb-api-key": `${process.env.BROWSERBASE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      proxies: true,
    }),
  });
  const json = await response.json();
  return json;
}

// Load page from the internet
async function loadPage({ url }: { url: string }) {
  const { id } = await createSession();
  const browser = await chromium.connectOverCDP(
    `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${id}`,
  );

  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0];

  await page.goto(url);

  const readable: { title?: string; textContent?: string } =
    await page.evaluate(`
    import('https://cdn.skypack.dev/@mozilla/readability').then(readability => {
      return new readability.Readability(document).parse()
    })`);
  const text = `${readable.title}\n${readable.textContent}`;

  return { page: text };
}

// Create a new project and tool in Braintrust
const project = braintrust.projects.create({ name: "Browserbase API Tool" });

project.tools.create({
  handler: loadPage,
  parameters: z.object({
    url: z.string(),
  }),
  returns: z.object({
    page: z.string(),
  }),
  name: "Load page",
  slug: "load-page",
  description: "Load a page from the internet",
  ifExists: "replace",
});