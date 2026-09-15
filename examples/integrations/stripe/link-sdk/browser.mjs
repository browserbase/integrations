import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

export const checkout = z
  .object({
    url: z.url(),
    merchant: z.string().min(1),
    product: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.literal("usd"),
    billingInterval: z.enum(["one_time", "day", "week", "month", "year"]),
    submitLabel: z.enum(["Pay", "Subscribe"]),
    successText: z.string().min(10),
  })
  .parse(JSON.parse(await readFile("checkout.json", "utf8")));
const url = new URL(checkout.url);
assert(
  url.protocol === "https:" &&
    url.hostname === "buy.stripe.com" &&
    /^\/test_[A-Za-z0-9]+$/.test(url.pathname),
  "Configure a Stripe test Payment Link. This example does not permit live checkout.",
);

export async function waitFor(read, accept, description, timeout = 45000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (accept(value)) return value;
    await delay(750);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for ${description}`);
}

export async function withCheckout(name, run) {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  assert(apiKey, "Configure BROWSERBASE_API_KEY through your secret manager");
  const dir = `artifacts/${name}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await mkdir(dir, { recursive: true });
  const browser = await browserbase.launch({ apiKey, api_timeout: 300 });
  let stagehand;
  try {
    stagehand = await Stagehand.create({
      browser,
      logging: { level: "error" },
    });
    const page = await browser.context.newPage();
    await page.goto(checkout.url, { waitUntil: "load" });
    await waitFor(
      () => page.locator("body").innerText(),
      (text) => /Sandbox|Test mode/i.test(text),
      "Stripe test-mode indicator",
    );
    const { data: order } = await stagehand.extract(
      "Read the checkout merchant, product, final total due today in integer cents, three-letter currency, and billing interval (one_time, day, week, month, or year). Use only visible checkout details.",
      z.object({
        merchant: z.string(),
        product: z.string(),
        amount: z.number().int(),
        currency: z.string(),
        billingInterval: z.string(),
      }),
      { page },
    );
    assert(
      order.merchant === checkout.merchant &&
        order.product === checkout.product &&
        order.amount === checkout.amount &&
        order.currency.toLowerCase() === checkout.currency &&
        order.billingInterval === checkout.billingInterval,
      "Visible order differs from checkout.json",
    );
    console.log(
      JSON.stringify({
        event: "order_verified",
        amount: order.amount,
        currency: order.currency,
        billingInterval: order.billingInterval,
      }),
    );
    const result = await run(page, stagehand);
    await writeFile(
      `${dir}/result.json`,
      JSON.stringify({ test: true, result }, null, 2),
    );
    return result;
  } finally {
    try {
      await stagehand?.close();
    } finally {
      await browser.close();
    }
  }
}

export async function openCardForm(page, stagehand) {
  const action = await stagehand.act(
    "Select Card as the payment method. Do not submit a payment.",
    { page },
  );
  assert(action.data.success, "Stagehand must select Card");
  return waitFor(
    () => page.snapshot(),
    (snapshot) => snapshot.formattedTree.includes("Card number"),
    "card fields",
  );
}
