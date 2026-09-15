import assert from "node:assert/strict";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { checkout } from "./browser.mjs";
const path = "artifacts/spend-request.json";
const configHash = createHash("sha256")
  .update(JSON.stringify(checkout))
  .digest("hex");
export async function acquireRunLock() {
  await mkdir("artifacts", { recursive: true });
  const lock = await open("artifacts/run.lock", "wx", 0o600);
  return async () => {
    await lock.close();
    await unlink("artifacts/run.lock");
  };
}
export async function saveState(state) {
  await mkdir("artifacts", {
    recursive: true,
  });
  await writeFile(`${path}.tmp`, JSON.stringify(state, null, 2), {
    mode: 0o600,
  });
  await rename(`${path}.tmp`, path);
}
export async function readState() {
  try {
    const state = JSON.parse(await readFile(path, "utf8"));
    assert(
      state.configHash === configHash &&
        state.test === true &&
        state.amount === checkout.amount &&
        state.currency === checkout.currency &&
        state.url === checkout.url,
      "Saved spend request does not match this sandbox checkout",
    );
    return state;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const state = {
      idempotencyKey: randomUUID(),
      configHash,
      test: true,
      amount: checkout.amount,
      currency: checkout.currency,
      url: checkout.url,
      phase: "new",
    };
    await saveState(state);
    return state;
  }
}
export function reportError(error) {
  // Do not log raw SDK details or browser exceptions that may contain card data.
  const value = error;
  console.error(
    JSON.stringify({
      event: "failed",
      name: value.name,
      code: value.code,
      status: value.status,
    }),
  );
  process.exitCode = 1;
}
