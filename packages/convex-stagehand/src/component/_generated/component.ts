/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

type ModelConfig =
  | string
  | {
      modelName?: string;
      apiKey?: string;
      baseURL?: string;
      provider?: string;
    };

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      act: FunctionReference<
        "action",
        "internal",
        {
          action: string;
          browserbaseApiKey: string;
          browserbaseProjectId: string;
          browserbaseSessionCreateParams?: any;
          model?: ModelConfig;
          modelApiKey: string;
          modelName?: string;
          options?: {
            timeout?: number;
            variables?: Record<string, string>;
            waitUntil?: "load" | "domcontentloaded" | "networkidle";
          };
          sessionConfig?: {
            domSettleTimeoutMs?: number;
            experimental?: boolean;
            selfHeal?: boolean;
            systemPrompt?: string;
            verbose?: number;
          };
          sessionId?: string;
          url?: string;
        },
        { actionDescription: string; message: string; success: boolean },
        Name
      >;
      agent: FunctionReference<
        "action",
        "internal",
        {
          browserbaseApiKey: string;
          browserbaseProjectId: string;
          browserbaseSessionCreateParams?: any;
          instruction: string;
          model?: ModelConfig;
          modelApiKey: string;
          modelName?: string;
          options?: {
            cua?: boolean;
            executionModel?: ModelConfig;
            highlightCursor?: boolean;
            maxSteps?: number;
            mode?: string;
            provider?: string;
            shouldCache?: boolean;
            systemPrompt?: string;
            timeout?: number;
            waitUntil?: "load" | "domcontentloaded" | "networkidle";
          };
          sessionConfig?: {
            domSettleTimeoutMs?: number;
            experimental?: boolean;
            selfHeal?: boolean;
            systemPrompt?: string;
            verbose?: number;
          };
          sessionId?: string;
          url?: string;
        },
        {
          actions: Array<{
            action?: string;
            instruction?: string;
            pageText?: string;
            pageUrl?: string;
            reasoning?: string;
            taskCompleted?: boolean;
            timeMs?: number;
            type: string;
          }>;
          completed: boolean;
          message: string;
          metadata?: any;
          success: boolean;
          usage?: {
            cached_input_tokens?: number;
            inference_time_ms: number;
            input_tokens: number;
            output_tokens: number;
            reasoning_tokens?: number;
          };
        },
        Name
      >;
      endSession: FunctionReference<
        "action",
        "internal",
        {
          browserbaseApiKey: string;
          browserbaseProjectId: string;
          modelApiKey: string;
          modelName?: string;
          sessionId: string;
        },
        { success: boolean },
        Name
      >;
      extract: FunctionReference<
        "action",
        "internal",
        {
          browserbaseApiKey: string;
          browserbaseProjectId: string;
          browserbaseSessionCreateParams?: any;
          instruction: string;
          model?: ModelConfig;
          modelApiKey: string;
          modelName?: string;
          options?: {
            selector?: string;
            timeout?: number;
            waitUntil?: "load" | "domcontentloaded" | "networkidle";
          };
          schema: any;
          sessionConfig?: {
            domSettleTimeoutMs?: number;
            experimental?: boolean;
            selfHeal?: boolean;
            systemPrompt?: string;
            verbose?: number;
          };
          sessionId?: string;
          url?: string;
        },
        any,
        Name
      >;
      observe: FunctionReference<
        "action",
        "internal",
        {
          browserbaseApiKey: string;
          browserbaseProjectId: string;
          browserbaseSessionCreateParams?: any;
          instruction: string;
          model?: ModelConfig;
          modelApiKey: string;
          modelName?: string;
          options?: {
            selector?: string;
            timeout?: number;
            waitUntil?: "load" | "domcontentloaded" | "networkidle";
          };
          sessionConfig?: {
            domSettleTimeoutMs?: number;
            experimental?: boolean;
            selfHeal?: boolean;
            systemPrompt?: string;
            verbose?: number;
          };
          sessionId?: string;
          url?: string;
        },
        Array<{
          arguments?: Array<string>;
          backendNodeId?: number;
          description: string;
          method?: string;
          selector: string;
        }>,
        Name
      >;
      startSession: FunctionReference<
        "action",
        "internal",
        {
          browserbaseApiKey: string;
          browserbaseProjectId: string;
          browserbaseSessionCreateParams?: any;
          browserbaseSessionID?: string;
          model?: ModelConfig;
          modelApiKey: string;
          modelName?: string;
          options?: {
            domSettleTimeoutMs?: number;
            experimental?: boolean;
            selfHeal?: boolean;
            systemPrompt?: string;
            timeout?: number;
            verbose?: number;
            waitUntil?: "load" | "domcontentloaded" | "networkidle";
          };
          url: string;
        },
        { cdpUrl?: string; sessionId: string },
        Name
      >;
    };
  };
