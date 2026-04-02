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
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { getCard } from "./3-get-card.js";

dotenv.config();

const cardId = "ic_1Qu1XJGhqv5yXZ43z9OdjbXs"; // replace with your card id from the previous step

export async function main({
  stagehand,
}: {
  stagehand: Stagehand;
}) {
  const page = stagehand.context.pages()[0];
  const paymentInfo = await getCard(cardId);

  // Navigate to Red Cross donation page
  await page.goto('https://www.redcross.org/donate/donation.html/')
  const donationAmount = await stagehand.observe(
      "Find the donation amounts"
  );
  // Click the first donation amount
  await stagehand.act(donationAmount[0])

  // Find the continue button and click it
  const continueButton = await stagehand.observe(
      "Find the continue button and click it"
  );
  await stagehand.act(continueButton[0])

  // Find the credit card button and click it
  const creditCardButton = await stagehand.observe(
      "Find the credit card button and click it"
  );
  await stagehand.act(creditCardButton[0])

  await stagehand.act("click the continue button")

  const formValues = await stagehand.observe(
      `Fill in the form with the following values: ${JSON.stringify(paymentInfo)}`
  );
  console.log("formValues", formValues);

  // Fill in the form with the values
  for (const value of formValues) {
      await stagehand.act(value);
  }
}
