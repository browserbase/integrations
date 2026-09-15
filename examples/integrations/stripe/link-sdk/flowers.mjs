import assert from "node:assert/strict";
import { mkdir, open, rm, unlink, writeFile } from "node:fs/promises";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { readFlowersConfig } from "./flowers-config.mjs";
import { fillDelivery, prepareFlowers } from "./flowers-browser.mjs";

// This entry point prepares a live merchant cart. It does not request or submit payment.
let browser;
let stagehand;
let page;
let lock;
let phase = "setup";
try {
  assert(
    process.argv.length === 2,
    "Run npm run flowers without payment flags",
  );
  const config = await readFlowersConfig();
  assert(
    process.env.BROWSERBASE_API_KEY,
    "Supply BROWSERBASE_API_KEY through your secret manager",
  );
  await mkdir("artifacts", { recursive: true });
  lock = await open("artifacts/flowers.lock", "wx", 0o600);
  await rm("artifacts/flowers-result.json", { force: true });
  browser = await browserbase.launch({
    apiKey: process.env.BROWSERBASE_API_KEY,
    proxies: true,
    timeout: 900,
  });
  stagehand = await Stagehand.create({ browser, logging: { level: "error" } });
  console.log(
    JSON.stringify({
      event: "browser_started",
      sessionUrl: `https://www.browserbase.com/sessions/${browser.sessionId}`,
    }),
  );
  page = await browser.context.newPage();
  phase = "cart";
  const item = await prepareFlowers(page, stagehand, config);
  phase = "delivery";
  if (config.recipient) await fillDelivery(page, stagehand, config);
  const result = {
    status: config.recipient
      ? "PAYMENT_STEP_REACHED"
      : "DELIVERY_DETAILS_REQUIRED",
    merchant: "1-800-Flowers.com",
    ...item,
    size: config.size,
    deliveryZip: config.deliveryZip,
    itemPriceIsFinalTotal: false,
    complimentaryMessage: true,
    paymentRequested: false,
    orderPlaced: false,
  };
  await writeFile(
    "artifacts/flowers-result.json",
    JSON.stringify(result, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(result));
} catch (error) {
  if (page && phase === "cart") {
    try {
      await writeFile(
        "artifacts/flowers-cart-failure.png",
        await page.screenshot(),
        { mode: 0o600 },
      );
    } catch {
      /* Preserve the original error if the browser has disconnected. */
    }
  }
  // Browser and SDK error details can contain personal or payment data.
  console.error(
    JSON.stringify({
      event: "flowers_failed",
      phase,
      name: error.name,
      code: error.code,
      ...(["BROWSER_STATE_TIMEOUT", "BROWSER_ACTION_FAILED"].includes(
        error.code,
      ) && { step: error.step }),
    }),
  );
  process.exitCode = 1;
} finally {
  try {
    await stagehand?.close();
  } finally {
    try {
      await browser?.close();
    } finally {
      if (lock) {
        await lock.close();
        await unlink("artifacts/flowers.lock");
      }
    }
  }
}
