# Browse CLI + Link CLI

Give your agent the task of sending someone flowers. Browse CLI handles the website. Link CLI connects the agent to your Link wallet so it can request approval for the purchase and get a payment credential.

This guide uses 1-800-Flowers, a live merchant. Prepare the recipient and complete quote before requesting Link approval for an intended delivery.

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

## 3. Give your agent the flower-delivery task

Use the same merchant and purchase as the [Stagehand + Link SDK quickstart](../link-sdk/README.md):

```text
Use Browse CLI in a remote Browserbase session named flowers to prepare a
1-800-Flowers delivery:
https://www.1800flowers.com/floral-embrace-191167

Choose the Small Floral Embrace bouquet for ZIP 94107 and the next available
delivery date. Keep the complete order under $100, including delivery,
service fees, and tax. Skip optional gifts and paid greeting cards; use the
complimentary message "Thinking of you!". Do not sign up for marketing.

Ask me for the recipient's name, address, and phone number, plus any buyer
information the checkout requires. Show me the bouquet, delivery date,
recipient, and complete total once every charge is known.

Use Link's create-payment-credential skill to request approval for that exact
flower order. This is a live merchant. Wait for Link to report approval,
then complete checkout once and verify the merchant's order confirmation.
Keep payment credentials out of model prompts, chat, screenshots, and logs.
```

The agent should read the delivery calendar carefully: it can show more than one month, and same-day or weekend dates can carry surcharges. It should verify the selected date against the cart and choose the complimentary greeting message.

## 4. Approve the complete order in Link

The flower price is not the final total. The agent must finish the recipient step and read delivery charges, service fees, and tax before it creates a spend request. An order with charges still marked `TBD` is not ready for approval.

The payment skill uses `link-cli spend-request create` with the actual merchant, final amount in cents, currency, and purchase context. Open the approval URL and review that order in Link. The agent must wait for `approved` before retrieving a credential. If the order changes, it needs approval for the updated purchase.

Keep the browser session and request ID available while approval is pending. Resume that request after a polling timeout. For `requires_action`, follow Link's returned instructions and poll automatically only when its resolution is `auto_resume`.

## 5. Complete checkout and confirm delivery

For a standard card form, the agent retrieves the approved virtual card into a temporary file outside the repository:

```bash
LINK_CHECKOUT_DIR=$(mktemp -d)

link-cli spend-request retrieve lsrq_REPLACE_WITH_REQUEST_ID \
  --include card \
  --output-file "$LINK_CHECKOUT_DIR/card.json" \
  --format json
```

`--output-file` creates the file with `0600` permissions. The browser automation reads the returned card and billing details directly from that file and fills the merchant's payment fields without exposing them to the model. The agent must inspect the actual payment form and use a credential type that it supports.

The agent should submit only once and verify the merchant's order confirmation. Link approval confirms permission to pay; it does not prove that the merchant accepted the order. Preserve an uncertain submission for inspection before retrying.

Delete the credential file and close the named browser session when finished:

```bash
rm -f "$LINK_CHECKOUT_DIR/card.json"
rmdir "$LINK_CHECKOUT_DIR"
browse stop --session flowers
```

## Build this into your application

Use [Stagehand + Link SDK](../link-sdk/README.md) for the runnable flower-cart project and the payment handoff. Your application owns planning and conversation; Stagehand operates the browser and Link handles wallet approval.

- [Link CLI reference](https://github.com/stripe/link-cli): commands, account limits, and credential types.
- [Browse CLI](https://docs.browserbase.com/integrations/skills/browse-cli): browser sessions, snapshots, and interactions.
