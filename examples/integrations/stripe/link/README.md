# Browse CLI + Link CLI

Give your agent a task like ordering lunch or buying supplies. Browse CLI handles the website. Link CLI connects the agent to your Link wallet so it can request approval for the purchase and get a payment credential.

This guide uses a standard card checkout. Start with a test checkout while developing the integration.

## 1. Install the CLIs and skills

Use Node.js 22.18 or newer:

```bash
npm install -g browse @stripe/link-cli
browse skills install
npx skills add stripe/link-cli --skill create-payment-credential
```

Install the skills for the coding agent you use. The Browse skill teaches it how to navigate websites; Link's payment skill covers the wallet and checkout handoff.

Make your [Browserbase API key](https://www.browserbase.com/settings) available as `BROWSERBASE_API_KEY` through your environment or secret manager. Browse reads it when starting a remote session.

## 2. Connect your Link wallet

Check whether Link is already connected:

```bash
link-cli auth status
```

If it isn't, start the login flow:

```bash
link-cli auth login --client-name "Browserbase shopping agent" --interval 5 --timeout 300
```

Open the verification URL returned by Link, sign in, and approve the connection. Wait for authentication to finish before requesting a payment.

```bash
link-cli payment-methods list
```

If you need to add a payment method, do that in [Link](https://app.link.com). Link CLI uses your default eligible payment method unless you specify another one.

## 3. Give your agent the task

For example:

```text
Use Browse CLI to find a pizzeria that delivers to my office tomorrow at noon.
Put together an order for 10 people under $150, including tax, delivery, and tip.
Confirm the delivery address with me before requesting payment.

Use Link's create-payment-credential skill to request my approval for the final
order. Wait for Link to confirm approval, then complete checkout and verify
the order confirmation. Keep payment credentials out of chat and logs.
```

The agent should inspect the merchant's payment options and final total before it creates a spend request. A standard card form uses a virtual card. Link also supports other payment flows; let the merchant's checkout determine which one to use.

To inspect a checkout yourself, use a named Browse session. Replace this example URL with the merchant you're testing:

```bash
browse open https://shop.example/checkout --remote --session checkout
browse snapshot --session checkout
```

Keep that session open while the user reviews the payment request so the cart and checkout state are available afterward.

## 4. Request payment approval

The agent uses Link CLI to describe the purchase and request approval. Here's a **test-mode example** for a hypothetical $42 order. Replace the merchant, items, and amounts with the details from your test checkout:

```bash
link-cli spend-request create \
  --credential-type card \
  --merchant-name "Example Supply Store" \
  --merchant-url "https://shop.example" \
  --amount 4200 \
  --currency usd \
  --context "Buying two notebooks from Example Supply Store for the user's office. The checkout total is 42.00 USD including tax and shipping, within the requested budget." \
  --line-item "name:Notebook,unit_amount:1800,quantity:2" \
  --total "type:subtotal,display_text:Subtotal,amount:3600" \
  --total "type:tax,display_text:Tax,amount:300" \
  --total "type:shipping,display_text:Shipping,amount:300" \
  --total "type:total,display_text:Total,amount:4200" \
  --test \
  --request-approval \
  --format json
```

- USD amounts are in cents, so `4200` means $42.00. Use the final checkout total.
- `context` must contain at least 100 characters. Tell the user what you're buying and why.
- `--request-approval` starts the approval flow. Present any approval URL to the user; they can also review the request in the [Link app](https://link.com/download).
- `--test` returns test credentials and doesn't charge the underlying payment method. Use them only with a merchant's test checkout. Omit `--test` when you're ready to make a real, user-approved purchase.

**Continue only after the user approves the spend request and Link reports `status: "approved"`.** The CLI can also exit successfully after the user denies the request, the request expires, or the agent cancels it. Those outcomes do not authorize checkout.

In JSON mode, creation returns the request and an approval URL. Present the URL to the user and poll the same request using its returned ID. If polling times out, resume with that ID:

```bash
link-cli spend-request retrieve lsrq_REPLACE_WITH_REQUEST_ID \
  --interval 2 --max-attempts 300 --format json
```

For `requires_action`, show the user the action Link returns. Resume polling the same request when its resolution is `auto_resume`; otherwise, follow Link's instructions before creating another request.

## 5. Complete checkout and confirm the order

After the user approves the request, retrieve the credential into a temporary file outside your repository:

```bash
LINK_CHECKOUT_DIR=$(mktemp -d)

link-cli spend-request retrieve lsrq_REPLACE_WITH_REQUEST_ID \
  --include card \
  --output-file "$LINK_CHECKOUT_DIR/card.json" \
  --format json
```

`--output-file` creates the file with `0600` permissions and keeps the full card out of terminal output. The JSON file contains a `card` object with `number`, `cvc`, `exp_month`, `exp_year`, `billing_address`, and `valid_until`. Your browser automation should read those values directly from the file and fill the merchant's payment fields. Use the returned billing address and handle payment fields inside iframes when the merchant uses them. Keep card values out of model prompts, shell command arguments, screenshots, and logs.

Before submitting, check that the merchant, items, and final amount still match the approved request. If the order changed, get approval for the updated purchase first. After submitting, verify the merchant's order confirmation or receipt. Clicking **Pay** alone doesn't establish that the order succeeded.

Delete the credential file and close the browser session when finished:

```bash
rm -f "$LINK_CHECKOUT_DIR/card.json"
rmdir "$LINK_CHECKOUT_DIR"
browse stop --session checkout
```

## Use Link from application code

For a Node.js application built with [Stagehand](https://docs.stagehand.dev) or Playwright, you can use the [Link SDK](https://github.com/stripe/link-cli/tree/main/packages/sdk):

```bash
npm install @stripe/link-sdk
```

```typescript
import Link from '@stripe/link-sdk';

const accessToken = process.env.LINK_ACCESS_TOKEN;
if (!accessToken) throw new Error('LINK_ACCESS_TOKEN is required');

const link = new Link({ accessToken });
const paymentMethods = await link.paymentMethods.list();
```

The SDK accepts a Link access token supplied by your application; it doesn't perform login or store and refresh credentials for you. Follow the SDK's [user-approved purchase flow](https://github.com/stripe/link-cli/tree/main/packages/sdk#user-approved-purchase-flow) to create a spend request, present its approval URL, and resume the browser task after approval. Link CLI is the simpler starting point when you want those authentication flows handled for you.

## Next steps

- [Link CLI reference](https://github.com/stripe/link-cli): current commands, account limits, and supported credential types.
- [Browse CLI](https://docs.browserbase.com/integrations/skills/browse-cli): browser sessions, snapshots, and interactions.
- [Integration examples](https://github.com/browserbase/integrations/tree/main/examples/integrations/stripe): the Link workflow and earlier Stripe Issuing examples.
