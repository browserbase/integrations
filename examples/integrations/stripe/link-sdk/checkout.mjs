import assert from "node:assert/strict";
import { checkout, openCardForm, waitFor, withCheckout } from "./browser.mjs";
import { connectLink, waitForApproval } from "./link.mjs";
import { assertCardNumberForCheckout } from "./payment-card.mjs";
import { acquireRunLock, readState, reportError, saveState } from "./state.mjs";
let phase = "approval";
let release;
try {
  release = await acquireRunLock();
  const state = await readState();
  assert(state.spendRequestId, "Run npm run request first");
  assert(
    !["submitting", "confirmed"].includes(state.phase),
    "Payment already submitted; inspect the existing result before any retry",
  );
  const link = await connectLink();
  await waitForApproval(link, state.spendRequestId);
  phase = "browser";
  await withCheckout("checkout", async (page, stagehand) => {
    let snapshot = await openCardForm(page, stagehand);
    assert(
      !snapshot.formattedTree.includes(checkout.successText),
      "Confirmation text must not already appear before checkout",
    );
    function field(label) {
      const lines = snapshot.formattedTree.split("\n");
      const matches = lines.filter(
        (line) =>
          line
            .trim()
            .replace(/^\[[\d-]+\] /, "")
            .replace(/ \[checked\]$/, "") === label,
      );
      assert(matches.length === 1, `Expected one ${label}`);
      const ref = matches[0].match(/\[([\d-]+)\]/)?.[1];
      assert(ref && snapshot.xpathMap[ref], `Missing selector for ${label}`);
      return page.locator(`xpath=${snapshot.xpathMap[ref]}`);
    }
    // Resolve selectors while the form is empty, before loading payment data.
    const saveInfo = field("checkbox: Save my information for faster checkout");
    if (await saveInfo.isChecked()) await saveInfo.click();
    snapshot = await page.snapshot();
    const fields = {
      email: field("textbox: Email"),
      number: field("textbox: Card number"),
      expiry: field("textbox: Expiration"),
      cvc: field("textbox: Credit or debit card CVC/CVV"),
      name: field("textbox: Cardholder name"),
      country: field("select: Country or region"),
      zip: field("textbox: ZIP"),
      submit: field(`button: ${checkout.submitLabel}`),
    };
    assert(
      snapshot.formattedTree.includes(checkout.product),
      "Checkout product changed",
    );
    phase = "credential";
    const approved = await link.spendRequests.retrieve(state.spendRequestId, {
      include: ["card"],
    });
    assert(
      approved?.status === "approved",
      "Spend request must still be approved",
    );
    assert(
      approved.amount === checkout.amount &&
        approved.currency === checkout.currency,
      "Approved amount must match checkout",
    );
    // Card values remain in this process and go directly to the browser fields.
    const card = approved.card;
    assert(
      card && typeof card.number === "string" && typeof card.cvc === "string",
      "Link must return a complete test card",
    );
    assertCardNumberForCheckout(card.number);
    assert(
      Number.isInteger(card.exp_month) && Number.isInteger(card.exp_year),
      "Card expiration is required",
    );
    if (card.valid_until) {
      const value = String(card.valid_until);
      const timestamp = /^\d+$/.test(value)
        ? Number(value) * (Number(value) < 1e12 ? 1000 : 1)
        : Date.parse(value);
      assert(
        Number.isFinite(timestamp) && timestamp > Date.now() + 30000,
        "Payment credential expired or is about to expire",
      );
    }
    assert(
      !card.billing_address?.country || card.billing_address.country === "US",
      "This fixed sandbox adapter expects a US billing form",
    );
    // No model calls, snapshots, screenshots, or card logging after this point.
    phase = "fill";
    await fields.email.fill("browserbase-link-test@example.com");
    await fields.country.selectOption("US");
    await fields.name.fill(card.billing_address?.name || "Browserbase Sandbox");
    await fields.zip.fill(card.billing_address?.postal_code || "94107");
    await fields.number.fill(card.number);
    await fields.expiry.fill(
      `${String(card.exp_month).padStart(2, "0")}${String(card.exp_year).slice(-2)}`,
    );
    await fields.cvc.fill(card.cvc);
    assert(
      (await fields.number.inputValue()).replace(/\s/g, "") ===
        card.number.replace(/\s/g, ""),
      "Card field did not accept the credential",
    );
    console.log(
      JSON.stringify({
        event: "card_fields_filled",
        source: "link_sdk",
        test: true,
      }),
    );
    // Persist before clicking so an ambiguous result cannot trigger an automatic retry.
    state.phase = "submitting";
    await saveState(state);
    phase = "submit";
    await fields.submit.click();
    phase = "confirmation";
    await waitFor(
      () => page.locator("body").innerText(),
      (text) => text.includes(checkout.successText),
      "test checkout confirmation",
      60000,
    );
    state.phase = "confirmed";
    await saveState(state);
    const result = {
      status: "PASS",
      receipt: checkout.successText,
      test: true,
      amount: checkout.amount,
      currency: checkout.currency,
      stagehandSelectedCard: true,
      linkSdkCredential: true,
      directFieldFill: true,
      realMoneyMoved: false,
    };
    console.log(
      JSON.stringify({
        event: "checkout_confirmed",
        ...result,
      }),
    );
    return result;
  });
} catch (error) {
  console.error(
    JSON.stringify({
      event: "failed_phase",
      phase,
    }),
  );
  reportError(error);
} finally {
  await release?.();
}
