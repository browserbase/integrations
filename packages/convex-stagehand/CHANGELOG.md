# @browserbasehq/convex-stagehand

## 0.1.0

### Minor Changes

- [#11](https://github.com/browserbase/convex-stagehand/pull/11) [`ae8018e`](https://github.com/browserbase/convex-stagehand/commit/ae8018ef9188fff6bc221cc538fd2b832ec59c7d) Thanks [@shrey150](https://github.com/shrey150)! - Fix region handling for Stagehand sessions by persisting session region metadata and routing follow-up API calls to the correct regional Stagehand endpoint.
  - Store `region` on session metadata and resolve region internally for `extract`, `act`, `observe`, `agent`, and `endSession`.
  - Retry once on region-mismatch errors by parsing the returned region and updating metadata.
  - Keep operation request payloads aligned with Stagehand API docs (region is not sent in operation bodies).
  - Tighten internal TypeScript typing for region-aware API routing.

## 0.0.3

### Patch Changes

- [#9](https://github.com/browserbase/convex-stagehand/pull/9) [`32b6e70`](https://github.com/browserbase/convex-stagehand/commit/32b6e705e534984935a231857810d98e1f89f97a) Thanks [@victlue](https://github.com/victlue)! - Strictly type BrowserbaseSessionCreateParams to match the Stagehand API spec, removing index signature backdoors

## 0.0.2

### Patch Changes

- [#7](https://github.com/browserbase/convex-stagehand/pull/7) [`3ab9545`](https://github.com/browserbase/convex-stagehand/commit/3ab95452b00bd331ab170c26e0abc9888a099be9) Thanks [@shrey150](https://github.com/shrey150)! - Fix agent endpoint URL typo causing 404 errors. The agentExecute function was calling `/sessions/{id}/agent/execute` but the correct Stagehand API endpoint is `/sessions/{id}/agentExecute`. This fixes the `stagehand.agent()` function which was previously broken.

- [#3](https://github.com/browserbase/convex-stagehand/pull/3) [`14db9a8`](https://github.com/browserbase/convex-stagehand/commit/14db9a81c53d02300adbd0d19454c1c85fee9e1e) Thanks [@shrey150](https://github.com/shrey150)! - Fix ComponentApi type to eliminate type assertion requirement. The ComponentApi type now correctly specifies "internal" visibility for component functions, matching the types generated for consumers. Users no longer need to use `as unknown as ComponentApi` type assertion when initializing the Stagehand client.

  **Before:**

  ```typescript
  const stagehand = new Stagehand(components.stagehand as unknown as ComponentApi, { ... });
  ```

  **After:**

  ```typescript
  const stagehand = new Stagehand(components.stagehand, { ... });
  ```
