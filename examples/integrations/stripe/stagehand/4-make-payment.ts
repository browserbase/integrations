/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 *
 */
import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { getCard } from "./3-get-card.js";

dotenv.config();

const cardId = "ic_1Qu1XJGhqv5yXZ43z9OdjbXs"; // replace with your card id from the previous step

export async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  // Learn more about Stagehand: https://www.stagehand.dev/

  const paymentInfo = await getCard(cardId);

  // Navigate to Red Cross donation page
  await page.goto('https://www.redcross.org/donate/donation.html/')
  const donationAmount = await page.observe({
      instruction: "Find the donation amounts",
      returnAction: true,
      onlyVisible: false,
  });
  // Click the first donation amount
  await page.act(donationAmount[0])

  // Find the continue button and click it
  const continueButton = await page.observe({
      instruction: "Find the continue button and click it",
      returnAction: true,
      onlyVisible: false,
  });
  await page.act(continueButton[0])

  // Find the credit card button and click it
  const creditCardButton = await page.observe({
      instruction: "Find the credit card button and click it",
      returnAction: true,
      onlyVisible: false,
  });
  await page.act(creditCardButton[0])

  await page.act({action: "click the continue button"})

  const formValues = await page.observe({
      instruction: `Fill in the form with the following values: ${JSON.stringify(paymentInfo)}`,
      returnAction: true,
      onlyVisible: false,
  });
  console.log("formValues", formValues);

  // Fill in the form with the values
  for (const value of formValues) {
      await page.act(value);
  }
}
