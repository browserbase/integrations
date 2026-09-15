import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import Link from "@stripe/link-sdk";
// Your application owns user authorization and token refresh.
export async function connectLink() {
  const accessToken = process.env.LINK_ACCESS_TOKEN;
  assert(
    accessToken,
    "Supply a user-authorized LINK_ACCESS_TOKEN through your secret manager",
  );
  return new Link({ accessToken });
}

export async function waitForApproval(link, requestId) {
  const deadline = Date.now() + 5 * 60 * 1000;
  let previousStatus = "";
  do {
    const request = await link.spendRequests.retrieve(requestId);
    assert(request, "Spend request was not found");
    if (request.status !== previousStatus) {
      console.log(
        JSON.stringify({
          event: "spend_status",
          status: request.status,
        }),
      );
      previousStatus = request.status;
    }
    if (request.status === "approved") return request;
    if (request.status === "requires_action") {
      const next = request.status_details?.requires_action?.next_action;
      console.log(
        JSON.stringify({
          event: "user_action_required",
          type: next?.type,
          resolution: next?.resolution,
          message: next?.display_message,
          actionUrl: next?.action_url,
        }),
      );
      assert(
        next?.resolution === "auto_resume",
        "Complete the Link action before starting a new spend request",
      );
    } else if (request.status !== "pending_approval") {
      throw new Error(`Spend request is not usable: ${request.status}`);
    }
    await delay(2000);
  } while (Date.now() < deadline);
  console.log(
    JSON.stringify({
      event: "approval_pending",
      next: "Run npm run checkout again to resume the same request",
    }),
  );
  throw Object.assign(new Error("Approval is still pending"), {
    code: "APPROVAL_PENDING",
  });
}
