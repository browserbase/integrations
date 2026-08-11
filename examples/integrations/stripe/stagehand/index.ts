/**
 * 🤘 Welcome to Stagehand!
 *
 * You probably DON'T NEED TO BE IN THIS FILE
 *
 * You're probably instead looking for the main() function in main.ts
 *
 * This is run when you do npm run start; it just calls main()
 *
 */

import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import chalk from "chalk";
import { main } from "./4-make-payment.js";
import boxen from "boxen";

async function run() {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required");

  const browser = await browserbase.launch({
    apiKey,
  });
  const stagehand = await Stagehand.create({ browser });

  console.log(
    boxen(
      `View this session live in your browser: \n${chalk.blue(
        `https://browserbase.com/sessions/${browser.sessionId}`
      )}`,
      {
        title: "Browserbase",
        padding: 1,
        margin: 3,
      }
    )
  );

  await main({
    browser,
    stagehand,
  });
  await stagehand.close();
  await browser.close();
  console.log(
    `\n🤘 Thanks for using Stagehand! Create an issue if you have any feedback: ${chalk.blue(
      "https://github.com/browserbase/stagehand/issues/new"
    )}\n`
  );
}

run();
