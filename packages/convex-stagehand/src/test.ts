/// <reference types="vite/client" />
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");

/**
 * Register the Stagehand component with a test Convex instance.
 *
 * @param t - The test Convex instance from convexTest()
 * @param name - The name of the component as registered in convex.config.ts (default: "stagehand")
 *
 * @example
 * ```typescript
 * import { convexTest } from "convex-test";
 * import stagehandTest from "convex-stagehand/test";
 *
 * test("my test", async () => {
 *   const t = convexTest(schema, modules);
 *   stagehandTest.register(t, "stagehand");
 *   // ... run tests
 * });
 * ```
 */
export function register(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name: string = "stagehand",
) {
  t.registerComponent(name, schema, modules);
}

export default { register, schema, modules };
