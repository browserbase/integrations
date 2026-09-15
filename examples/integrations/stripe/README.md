# Agentic payments with Browserbase + Link

Give your agent a task like ordering lunch or buying supplies. **Browse CLI** handles the website and order details. **Link**, Stripe's agent wallet, lets the agent request your approval and get a payment credential to complete checkout.

For a standard card checkout, the agent uses the merchant's existing website. The merchant doesn't need to add a machine payments protocol to support that flow.

## Start with Link

- [Browse CLI + Link CLI quickstart](./link/README.md): install the tools, prepare an order, and request payment approval.
- [Browserbase integration docs](https://docs.browserbase.com/integrations/stripe/introduction): how the browser and wallet fit together.
- [Link CLI](https://github.com/stripe/link-cli): authentication, spend requests, payment credentials, and the agent skill.
- [Link SDK](https://github.com/stripe/link-cli/tree/main/packages/sdk): a typed Node.js client for applications that manage their own Link authorization and tokens.

You'll need a Browserbase API key, a Link account with an eligible payment method, and Node.js 22.18 or newer for the CLI workflow. Link handles access to the user's wallet; this flow doesn't require a Stripe Issuing account or Stripe secret API key.

## Earlier Stripe Issuing examples

The existing [Node.js](./node/README.md), [Python](./python/README.md), and [Stagehand](./stagehand/README.md) examples use Stripe Issuing to create cardholders and issue cards. They require a separate Issuing setup and don't implement Link's wallet or user-approval flow.

For new agentic payment integrations, start with the [Link quickstart](./link/README.md).
