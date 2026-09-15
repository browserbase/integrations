import { withCheckout, openCardForm, discoverCardFields } from "./browser.mjs";
import { reportError } from "./state.mjs";
try {
  await withCheckout("inspect", async (page, stagehand) => {
    await openCardForm(page, stagehand);
    const fields = await discoverCardFields(page, stagehand);
    const result = {
      status: "PASS",
      stagehandSelectedCard: true,
      stagehandObservedFields: Object.keys(fields),
      submitted: false,
    };
    console.log(JSON.stringify(result));
    return result;
  });
} catch (error) {
  reportError(error);
}
