# Stagehand + Link SDK

Add a user-approved checkout step to your agent. Stagehand reads and operates the website in a Browserbase browser. Link SDK requests access to the user's wallet for the purchase. Your application connects those steps and resumes after approval.

This example uses a **Stripe test Payment Link**, USD, and a US card form. It uses Stagehand's `extract()` and `act()` before loading the payment credential, then fills the card fields directly. It doesn't require Playwright or a separate Browserbase SDK package.

## Set up

You need:

- Node.js 22.18 or newer.
- A Browserbase API key available as `BROWSERBASE_API_KEY` through your environment or secret manager.
- A user-authorized Link access token with payment access, available as `LINK_ACCESS_TOKEN` through your environment or secret manager.
- A Stripe test Payment Link supplied by you or your integration maintainer. Configure a fixed USD price, a US billing form, and no shipping, automatic taxes, or additional required fields.

**Link SDK does not log users in or store and refresh credentials.** Your application owns those flows. A CLI login does not automatically authenticate this example. See the [SDK authentication contract](https://github.com/stripe/link-cli/tree/main/packages/sdk#credentials). For a coding agent that needs Link to handle login, use [Browse CLI + Link CLI](../link/README.md).

```bash
git clone https://github.com/browserbase/integrations.git
cd integrations/examples/integrations/stripe/link-sdk
npm install
cp checkout.example.json checkout.json
```

Edit `checkout.json` with your test link, the exact merchant and product names, the total in cents, and the checkout's confirmation text. Set `billingInterval` to `one_time` for a purchase or the displayed recurrence, such as `month`. Set `submitLabel` to `Pay` or `Subscribe` to match the form. The scripts reject live Payment Links.

Keep credentials in your secret manager. `checkout.json` contains checkout configuration, not API keys. Git ignores it and the run artifacts.

## 1. Inspect the checkout with Stagehand

```bash
npm run inspect
```

The script opens a Browserbase browser, checks the test-mode indicator, reads the order with `stagehand.extract()`, and compares it to your configuration. Then `stagehand.act()` selects Card. This step doesn't access Link or submit payment.

```javascript Node.js
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

await stagehand.act(
  "Select Card as the payment method. Do not submit a payment.",
  { page },
);
```

See [browser.mjs](./browser.mjs) for browser setup, order checks, and cleanup.

## 2. Request approval with Link SDK

```bash
npm run request
```

The script inspects the checkout, lists eligible Link payment methods, and creates a test spend request. It saves the request ID and an idempotency key so a retry can resume the same request.

The core Link calls in [request.mjs](./request.mjs) are:

```javascript Node.js
const request = await link.spendRequests.create({
  idempotency_key: state.idempotencyKey,
  payment_details: method.id,
  credential_type: "card",
  amount: checkout.amount,
  currency: checkout.currency,
  merchant_name: checkout.merchant,
  merchant_url: checkout.url,
  context: `Test the Browserbase and Link SDK integration by buying ${checkout.product} from ${checkout.merchant} for ${checkout.amount / 100} USD. Billing interval: ${checkout.billingInterval}. This is a test checkout using test credentials. No real money will move.`,
  request_approval: false,
  test: true,
});
const approval = await link.spendRequests.requestApproval(request.id);
```

Open the approval URL that the script prints. Your user decides whether to approve the purchase in Link. A connected wallet alone does not authorize payment.

This example requests a test virtual card. Link Pay Token is another execution option for compatible Stripe checkouts, but it doesn't support test mode.

## 3. Resume and verify checkout

```bash
npm run checkout
```

The script waits for `approved`, opens the checkout again, and checks that the order still matches. It resolves the empty form's selectors before retrieving the card. Card details go from Link SDK to deterministic Stagehand locator calls:

```javascript Node.js
const approved = await link.spendRequests.retrieve(state.spendRequestId, {
  include: ["card"],
});
assert(approved?.status === "approved");
const card = approved.card;

await fields.number.fill(card.number);
await fields.expiry.fill(
  `${String(card.exp_month).padStart(2, "0")}${String(card.exp_year).slice(-2)}`,
);
await fields.cvc.fill(card.cvc);
```

[checkout.mjs](./checkout.mjs) also handles the email and billing fields, disables saving payment information, checks credential expiration, submits once, and waits for your configured confirmation text. It makes no model calls after filling credentials. It writes a result only after the merchant confirms checkout.

If approval takes more than five minutes, rerun `npm run checkout` to resume the saved request. If Link denies, cancels, or expires the request, the script stops. For `requires_action`, it prints Link's next action and polls only when Link specifies `auto_resume`.

The scripts prevent concurrent payment runs with `artifacts/run.lock`. A killed process can leave that lock behind; remove it only after confirming the old process has stopped. If a run reaches `submitting` but misses the confirmation, inspect the merchant's existing transaction before retrying. Don't delete the state file to blindly repeat a payment.

## Adapt the example

Keep your agent's planning, search, and item selection in your application. Replace the checkout adapter when you support another merchant. Validate the final amount, billing terms, shipping, tax, and receipt for that site. This fixed test adapter does not cover arbitrary merchants, authentication challenges, or live purchases.

For long-running applications, replace the fixed token in [link.mjs](./link.mjs) with Link's `getAccessToken` callback backed by your credential manager. Browser recording and diagnostics also need your application's payment-data policy; direct field filling keeps card values out of model prompts, but it does not establish universal redaction.
