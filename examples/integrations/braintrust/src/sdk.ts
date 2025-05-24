/** This example is using the Browserbase SDK */

import * as braintrust from "braintrust";
import Browserbase from "@browserbasehq/sdk";
import { chromium } from "playwright-core";
import { z } from "zod";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY!;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID!;

async function load({ url }: { url: string }): Promise<{
  page: string;
}> {
  const bb = new Browserbase({
    apiKey: BROWSERBASE_API_KEY,
  });
  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID,
  });
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  await page.goto(url);

  const text = await page.textContent("body");
  return { page: text || "" };
}

const project = braintrust.projects.create({ name: "browse test" });

project.tools.create({
  handler: load,
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