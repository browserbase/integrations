import assert from "node:assert/strict";
import { getDuplicateSpendRequest } from "@stripe/link-sdk";
import { checkout, openCardForm, withCheckout } from "./browser.mjs";
import { connectLink } from "../../link.mjs";
import { acquireRunLock, readState, reportError, saveState } from "./state.mjs";
let release;
try {
  release = await acquireRunLock();
  const state = await readState();
  const link = await connectLink();
  assert(
    !["submitting", "confirmed"].includes(state.phase),
    "Checkout already submitted; do not repeat",
  );
  if (!state.spendRequestId) {
    await withCheckout("preflight", async (page, stagehand) => {
      const form = await openCardForm(page, stagehand);
      assert(
        form.formattedTree.includes(checkout.product),
        "Sandbox product changed",
      );
      return {
        status: "PASS",
        cardFormAvailable: true,
        submitted: false,
      };
    });
    const methods = await link.paymentMethods.list();
    const method = methods.find((value) => value.is_default) ?? methods[0];
    assert(method, "Add an eligible Link payment method");
    const request = await link.spendRequests
      .create({
        // Reuse the saved key if a network response is lost.
        idempotency_key: state.idempotencyKey,
        payment_details: method.id,
        credential_type: "card",
        amount: checkout.amount,
        currency: checkout.currency,
        merchant_name: checkout.merchant,
        merchant_url: checkout.url,
        context: `Test the Browserbase and Link SDK integration by buying ${checkout.product} from ${checkout.merchant} for ${checkout.amount / 100} USD. Billing interval: ${checkout.billingInterval}. This is a test checkout using test credentials. No real money will move.`,
        line_items: [
          {
            name: checkout.product,
            quantity: 1,
            unit_amount: checkout.amount,
          },
        ],
        request_approval: false,
        // Keep test mode enabled. Link Pay Token does not support test mode.
        test: true,
      })
      .catch((error) => {
        const duplicate = getDuplicateSpendRequest(error);
        if (!duplicate) throw error;
        return duplicate;
      });
    state.spendRequestId = request.id;
    await saveState(state);
  }
  const request = await link.spendRequests.retrieve(state.spendRequestId);
  assert(request, "Saved spend request was not found");
  if (request.status === "created") {
    const approval = await link.spendRequests.requestApproval(request.id);
    state.approvalUrl = approval.approval_url;
    state.phase = "awaiting_approval";
    await saveState(state);
  } else if (request.approval_url) {
    state.approvalUrl = request.approval_url;
    await saveState(state);
  }
  console.log(
    JSON.stringify({
      event: "test_approval",
      approvalUrl: state.approvalUrl,
      amount: checkout.amount,
      currency: checkout.currency,
      test: true,
    }),
  );
} catch (error) {
  reportError(error);
} finally {
  await release?.();
}
