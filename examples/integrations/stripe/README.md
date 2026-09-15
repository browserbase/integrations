# Agentic payments with Browserbase + Link

Add purchases to your agent with **Stagehand on Browserbase + Link SDK**. Stagehand reads and operates the merchant's website. Link, Stripe's agent wallet, provides a payment credential after the user approves the purchase. Your application coordinates those steps.

For a standard card checkout, the agent uses the merchant's existing website. The merchant doesn't need to add a machine payments protocol to support that flow.

## Send flowers with Link

The main example uses **1-800-Flowers**: choose a bouquet, arrange delivery, verify the complete quote, and request the user's approval to pay. The runnable flow currently prepares the cart and reaches recipient details; the final quote and payment adapter remain in progress.

- [Stagehand + Link SDK quickstart](./link-sdk/README.md): the flower walkthrough and runnable Node.js project.
- [Browse CLI + Link CLI](./link/README.md): give a coding agent the same flower-delivery task through its browser and wallet skills.
- [Browserbase integration docs](https://docs.browserbase.com/integrations/stripe/introduction): how the browser and wallet fit together.
- [Link SDK](https://github.com/stripe/link-cli/tree/main/packages/sdk): the application API and authentication contract.

You'll need a Browserbase API key, a Link account with an eligible payment method, and Node.js 22.18 or newer. For the SDK, your application owns Link authorization and token refresh. The CLI handles those flows for a coding agent.

## Earlier Stripe Issuing examples

The existing [Node.js](./node/README.md), [Python](./python/README.md), and [Stagehand](./stagehand/README.md) examples use Stripe Issuing to create cardholders and issue cards. They require a separate Issuing setup and don't implement Link's wallet or user-approval flow.

For new agentic payment integrations, start with the [Stagehand + Link SDK example](./link-sdk/README.md).
