# Send flowers with Stagehand + Link SDK

Give your agent a concrete task: send a small Floral Embrace bouquet from **1-800-Flowers** to a recipient in ZIP **94107**, on the next available delivery date, within a **$100 total budget**.

Stagehand operates the merchant's website in a Browserbase browser. Link SDK requests the user's approval to pay for the order. Your application connects the browser task to the user's wallet.

**Implementation status:** the runnable example prepares the flower cart and reaches the recipient form. The final quote, Link approval, and payment steps still need a verified checkout adapter. The payment sections below describe that handoff; `npm run flowers` does not request payment or place an order.

## 1. Set up the flower delivery

You need Node.js 22.18 or newer and a Browserbase API key available as `BROWSERBASE_API_KEY` through your environment or secret manager.

```bash
git clone https://github.com/browserbase/integrations.git
cd integrations/examples/integrations/stripe/link-sdk
npm ci
cp flowers.example.json flowers.json
```

The example configuration selects the bouquet, size, destination, delivery timing, and budget:

```json
{
  "productUrl": "https://www.1800flowers.com/floral-embrace-191167",
  "product": "Floral Embrace™",
  "size": "Small",
  "deliveryZip": "94107",
  "deliveryTimeZone": "America/Los_Angeles",
  "locationType": "Residence",
  "deliveryDate": "next_available",
  "maxTotal": 10000,
  "recipient": null,
  "giftMessage": "Thinking of you!"
}
```

Amounts use integer cents. Keep `recipient: null` to inspect the cart before providing delivery details. Git ignores `flowers.json` and the run artifacts. Keep credentials in your secret manager.

## 2. Prepare the cart with Stagehand

```bash
npm run flowers
```

The script opens a Browserbase session and prints its Session Inspector URL. It selects the small bouquet, enters the delivery ZIP, chooses the earliest available date, skips optional gifts and email signup, and selects the complimentary greeting message.

Use `act()` for browser interaction and `observe()` to discover controls on the current page. For example, the cart helper fills the delivery ZIP through an observed action:

```javascript Node.js
await stagehand.act(`Select the ${config.size} bouquet size.`, {
  page,
  cache: false,
});

const { data: zipFields } = await stagehand.observe(
  "Find the Delivery Zip Code input field.",
  { page, cache: false },
);
assert(zipFields.length === 1);
await stagehand.act(
  { ...zipFields[0], method: "fill", arguments: [config.deliveryZip] },
  { page, cache: false },
);
```

The calendar can show multiple months. The script gives `extract()` today's date in the delivery time zone, finds the earliest enabled date, then uses `observe()` to locate that date's control. Surcharged dates count as available. After adding the bouquet, it checks that the cart contains the selected date.

Read the cart with `extract()`:

```javascript Node.js
const { data: item } = await stagehand.extract(
  "Read the flower product name, displayed item price in integer cents, and selected delivery date as YYYY-MM-DD. Exclude optional add-on products. This price is not the complete order total.",
  z.object({
    product: z.string(),
    itemAmount: z.number().int().positive(),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  { page, cache: false },
);
```

[flowers-browser.mjs](https://github.com/browserbase/integrations/blob/main/examples/integrations/stripe/link-sdk/flowers-browser.mjs) contains the browser actions and cart checks. [flowers.mjs](https://github.com/browserbase/integrations/blob/main/examples/integrations/stripe/link-sdk/flowers.mjs) handles the session, run lock, result file, and cleanup. The browser flow uses controls discovered from the page, without hardcoded merchant selectors.

With no recipient configured, the script returns `DELIVERY_DETAILS_REQUIRED`, writes `artifacts/flowers-result.json`, and closes the browser. The result distinguishes the item price from a final total and reports whether fees remain pending.

## 3. Enter delivery details and verify the final quote

Set `recipient` in your local `flowers.json` to the intended recipient's details:

```json
{
  "firstName": "Recipient first name",
  "lastName": "Recipient last name",
  "address1": "Recipient street address",
  "address2": "",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94107",
  "phone": "4155550100"
}
```

Replace the placeholders with the intended delivery information. The recipient ZIP must match `deliveryZip`; update `deliveryTimeZone` if you change the destination. The script uses observed fields to enter the recipient details and attempts to save the shipment. This recipient submission path still needs verification.

The remaining checkout adapter must read a complete quote after delivery validation: bouquet and size, recipient destination, delivery date, item price, delivery and service fees, tax, currency, and final amount. It must also collect any buyer details the checkout requires.

Do not use the bouquet price as the Link approval amount. The merchant can show an “Order Total” while tax or service fees still say `TBD`. Wait until every required charge is known, then check the complete amount against `maxTotal`.

## 4. Request approval for the flower order

Connect the user's Link wallet through your application's authorization flow. Supply its user-authorized access token as `LINK_ACCESS_TOKEN` through your secret manager. **Link SDK does not perform login or manage token storage and refresh.** See the [SDK authentication contract](https://github.com/stripe/link-cli/tree/main/packages/sdk#credentials). For a coding agent that needs a ready-made login flow, use [Browse CLI + Link CLI](https://github.com/browserbase/integrations/tree/main/examples/integrations/stripe/link).

Once the checkout adapter produces a verified `quote` with `amount`, `currency`, `deliveryDate`, and `feesPending`, the application can request Link approval. Persist an idempotency key for that order before creation and the returned request ID before requesting approval, so a retry resumes the same purchase.

These are the Link calls for the handoff; they are not yet wired into the flower runner:

```javascript Node.js
assert(quote.feesPending === false);
assert(quote.currency === "usd");
assert(Number.isInteger(quote.amount) && quote.amount > 0);
assert(quote.amount <= config.maxTotal);

const request = await link.spendRequests.create({
  idempotency_key: state.idempotencyKey,
  payment_details: method.id,
  credential_type: "card",
  amount: quote.amount,
  currency: quote.currency,
  merchant_name: "1-800-Flowers.com",
  merchant_url: "https://www.1800flowers.com",
  context: `The user asked for a ${config.size} ${config.product} bouquet delivered to ZIP ${config.deliveryZip} on ${quote.deliveryDate}, with a complimentary greeting message. The verified total is ${quote.amount / 100} USD, including delivery, service fees, and tax.`,
  request_approval: false,
  test: false,
});
```

Here, `link` is the client from [link.mjs](https://github.com/browserbase/integrations/blob/main/examples/integrations/stripe/link-sdk/link.mjs), and `method` is an eligible method from `link.paymentMethods.list()`. After saving `request.id`, call `link.spendRequests.requestApproval(request.id)`, present its `approval_url`, and poll that same request for `approved`. A wallet connection alone does not authorize the order.

1-800-Flowers is a live merchant. The spend request describes an intended flower delivery and uses live credentials; Link test credentials do not make its checkout a sandbox.

## 5. Complete checkout and verify the order

The flower payment adapter still needs implementation against the merchant's payment form. Its responsibilities are:

1. Recheck the flower order and final total against the approved request.
2. Use `observe()` to discover the empty payment controls before retrieving the credential.
3. Retrieve the approved credential with `link.spendRequests.retrieve(request.id, { include: ["card"] })` and validate it.
4. Fill the credential directly into the observed fields. Make no model calls, screenshots, or payment-data logs after filling the card.
5. Record that submission has started, submit once, and verify the merchant's order confirmation. Preserve an ambiguous result for inspection before any retry.

Link approval confirms permission to pay. The merchant's receipt confirms the order. Keep both checks in the integration, and leave your agent's planning, recipient selection, and conversation flow in your application.
