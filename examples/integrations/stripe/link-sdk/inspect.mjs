import { withCheckout, openCardForm } from "./browser.mjs";
import { reportError } from "./state.mjs";
try {
  await withCheckout("inspect", async (page, stagehand) => {
    await openCardForm(page, stagehand);
    const result = {
      status: "PASS",
      stagehandSelectedCard: true,
      submitted: false,
    };
    console.log(JSON.stringify(result));
    return result;
  });
} catch (error) {
  reportError(error);
}
