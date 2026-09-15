import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";

export async function waitFor(read, accept, description, timeout = 60000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (accept(value)) return value;
    await delay(1000);
  } while (Date.now() < deadline);
  throw Object.assign(new Error(`Timed out waiting for ${description}`), {
    code: "BROWSER_STATE_TIMEOUT",
    step: description,
  });
}

async function act(stagehand, page, instruction, options = {}) {
  const result = await stagehand.act(instruction, {
    page,
    cache: false,
    ...options,
  });
  if (!result.data.success)
    throw Object.assign(new Error("Browser action failed"), {
      code: "BROWSER_ACTION_FAILED",
    });
}

async function observeOne(stagehand, page, instruction, options = {}) {
  const { data: actions } = await stagehand.observe(instruction, {
    page,
    cache: false,
    ...options,
  });
  assert(actions.length === 1, "Stagehand must identify one matching control");
  return actions[0];
}

async function fillObserved(stagehand, page, description, value) {
  const field = await observeOne(
    stagehand,
    page,
    `Find the ${description} input field.`,
  );
  // Replay the observed action with a value supplied by the application.
  await act(stagehand, page, { ...field, method: "fill", arguments: [value] });
}

async function dismissPromotion(page, stagehand) {
  const snapshot = await page.snapshot();
  if (/dialog:.*(?:email|off|offer)/i.test(snapshot.formattedTree)) {
    await act(
      stagehand,
      page,
      "Close the promotional email signup dialog without signing up or entering an email.",
    );
  }
}

export async function prepareFlowers(page, stagehand, config) {
  await page.goto(config.productUrl, { waitUntil: "domcontentloaded" });
  await waitFor(
    () => page.locator("body").innerText(),
    (text) => /Delivery Zip Code/i.test(text),
    "product delivery options",
  );
  await dismissPromotion(page, stagehand);
  console.log(JSON.stringify({ event: "flower_step", step: "select_size" }));
  await act(stagehand, page, `Select the ${config.size} bouquet size.`);
  await fillObserved(stagehand, page, "Delivery Zip Code", config.deliveryZip);
  await act(
    stagehand,
    page,
    `Choose ${config.locationType} as the delivery Location Type.`,
  );
  console.log(JSON.stringify({ event: "flower_step", step: "open_calendar" }));
  await act(
    stagehand,
    page,
    "Click Add to Cart to open the delivery-date calendar. Do not add a greeting card.",
  );
  await waitFor(
    () => page.locator("body").innerText(),
    (text) => /SELECT DELIVERY DATE/i.test(text),
    "delivery calendar",
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.deliveryTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const { data: availableDate } = await stagehand.extract(
    `Today is ${today} in the delivery region. Read the open calendar from its first displayed month. Return the earliest enabled delivery date ON OR AFTER today as YYYY-MM-DD. Crossed-out gray dates are disabled. Blue dates with surcharges are enabled and count as available. Compare the month as well as the day. Explain which earlier days are disabled.`,
    z.object({
      firstMonth: z.string(),
      deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string(),
    }),
    { page, cache: false, screenshot: true },
  );
  z.iso.date().parse(availableDate.deliveryDate);
  assert(availableDate.deliveryDate >= today, "Delivery date is in the past");
  console.log(JSON.stringify({ event: "delivery_date", ...availableDate }));
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${availableDate.deliveryDate}T12:00:00Z`));
  const date = await observeOne(
    stagehand,
    page,
    `Find the enabled calendar date ${dateLabel} in its matching month and return only that date's click action. Do not choose a different date or change the month.`,
  );
  await act(stagehand, page, date);
  console.log(JSON.stringify({ event: "flower_step", step: "wait_for_cart" }));
  await waitFor(
    () => page.url(),
    (url) => new URL(url).pathname === "/add-ons",
    "flower added to cart",
  );
  await dismissPromotion(page, stagehand);
  const { data: item } = await stagehand.extract(
    "Read the flower product name, displayed item price in integer cents, and selected delivery date as YYYY-MM-DD. Exclude optional add-on products. This price is not the complete order total.",
    z.object({
      product: z.string(),
      itemAmount: z.number().int().positive(),
      deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    { page, cache: false },
  );
  const normalizeName = (value) => value.replace(/[™®]/g, "").trim();
  assert(
    normalizeName(item.product) === normalizeName(config.product),
    "Cart product changed",
  );
  assert(
    item.itemAmount <= config.maxTotal,
    "Item exceeds the configured budget",
  );
  assert(
    item.deliveryDate === availableDate.deliveryDate,
    "Cart delivery date differs from the selected date",
  );
  console.log(
    JSON.stringify({
      event: "flower_cart",
      ...item,
      deliveryZip: config.deliveryZip,
    }),
  );
  await dismissPromotion(page, stagehand);
  const checkout = await observeOne(
    stagehand,
    page,
    "Find the visible Checkout button that continues to recipient delivery information. Exclude Continue Shopping and the optional gifts' Add To Cart buttons.",
  );
  await act(stagehand, page, checkout);
  await waitFor(
    () => page.locator("body").innerText(),
    (text) =>
      /Delivery Information/i.test(text) &&
      /RECIPIENT'S FIRST NAME/i.test(text),
    "recipient delivery form",
  );
  await act(
    stagehand,
    page,
    "Select Complimentary Greeting Message instead of the paid personalized greeting card. Do not submit the shipment.",
  );
  await fillObserved(
    stagehand,
    page,
    "complimentary gift message",
    config.giftMessage,
  );
  const { data: delivery } = await stagehand.extract(
    "Check whether Complimentary Greeting Message is selected, and whether any order tax or service fee still says TBD. Do not infer a final total from the item price.",
    z.object({ complimentaryMessage: z.boolean(), feesPending: z.boolean() }),
    { page, cache: false },
  );
  assert(
    delivery.complimentaryMessage,
    "Complimentary message must be selected",
  );
  return { ...item, ...delivery };
}

export async function fillDelivery(page, stagehand, config) {
  const recipient = config.recipient;
  assert(recipient, "Recipient details are required before quoting delivery");
  for (const [description, value] of [
    ["recipient's first name", recipient.firstName],
    ["recipient's last name", recipient.lastName],
    ["delivery street address", recipient.address1],
    ...(recipient.address2 ? [["apartment or suite", recipient.address2]] : []),
    ["delivery ZIP code", recipient.postalCode],
    ["delivery city", recipient.city],
    ["recipient phone number", recipient.phone],
  ])
    await fillObserved(stagehand, page, description, value);
  await act(
    stagehand,
    page,
    `Select ${recipient.state} as the delivery state.`,
  );
  await act(
    stagehand,
    page,
    "Click Save Shipment to Continue. Do not place an order.",
  );
  await waitFor(
    () => page.url(),
    (url) => new URL(url).pathname.startsWith("/checkout/payment/"),
    "payment step after delivery validation",
  );
}
