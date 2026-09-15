# Stripe sandbox diagnostic

Maintainer diagnostic for isolating Link test-credential compatibility and browser form behavior. The customer-facing integration uses [1-800-Flowers](../../README.md).

Install the parent example's dependencies, then run this diagnostic from its own directory:

```bash
cd examples/integrations/stripe/link-sdk
npm ci
cd diagnostics/stripe-sandbox
cp checkout.example.json checkout.json
```

Supply `BROWSERBASE_API_KEY` through your secret manager. Configure `checkout.json` with a Stripe test Payment Link, the exact merchant/product, fixed USD amount, billing interval, submit label, and success text. The diagnostic rejects live links and expects a US billing form without shipping, automatic tax, or additional required fields.

`npm run inspect` extracts the order, selects Card, and observes the empty controls without using Link. For the separate wallet test, supply an application-authorized `LINK_ACCESS_TOKEN`, run `npm run request`, approve the returned Link URL, then run `npm run checkout`. Creation uses `test: true`.

The actual Link test credential in the September 15 dogfood run failed its card-number checksum. Stripe rejected it before sending a payment request. The code now stops with `INVALID_PAYMENT_CREDENTIAL` before filling an invalid card. A separate control using Stripe's documented test fixture reached a receipt; that does not establish Link payment completion. See [Stripe's test fixtures](https://docs.stripe.com/testing).

This diagnostic owns its `artifacts/spend-request.json` and `artifacts/run.lock`. Resume the same saved request after an approval timeout. If the saved phase is `submitting` or `confirmed`, do not reset it to repeat a payment. Inspect the existing merchant result first. A killed process can leave a lock behind; remove it only after confirming the old process stopped.

Keep credentials and artifacts out of version control. Direct field filling keeps card values out of model prompts; recording and diagnostics still need the application's payment-data policy.
