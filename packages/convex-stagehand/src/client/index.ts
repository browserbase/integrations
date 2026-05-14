/**
 * Stagehand Client
 *
 * Type-safe wrapper for the Stagehand Convex component.
 * Uses Zod schemas for extraction typing.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type {
  GenericActionCtx,
  FunctionReference,
} from "convex/server";

/**
 * Component API type for the Stagehand component.
 * Functions are marked as "internal" because component functions
 * are internal from the consumer's perspective.
 */
export type ComponentApi = {
  lib: {
    startSession: FunctionReference<"action", "internal">;
    endSession: FunctionReference<"action", "internal">;
    extract: FunctionReference<"action", "internal">;
    act: FunctionReference<"action", "internal">;
    observe: FunctionReference<"action", "internal">;
    agent: FunctionReference<"action", "internal">;
  };
};

type ActionCtx = GenericActionCtx<any>;

/**
 * Model configuration for custom endpoints, proxies, or alternative providers.
 * @see https://docs.stagehand.dev/v3/references/stagehand
 */
export interface ModelConfig {
  modelName?: string;
  apiKey?: string;
  baseURL?: string;
  provider?: "openai" | "anthropic" | "google" | "microsoft";
}

export interface StagehandConfig {
  browserbaseApiKey: string;
  browserbaseProjectId: string;
  modelApiKey: string;
  modelName?: string;
  /** Full model configuration with baseURL support. Overrides modelName when modelName is also set. */
  model?: ModelConfig;
  /** Logging verbosity level for sessions. */
  verbose?: 0 | 1 | 2;
  /** Enable self-healing for failed actions. */
  selfHeal?: boolean;
  /** Custom system prompt for AI operations. */
  systemPrompt?: string;
  /** Timeout in ms to wait for DOM to settle. */
  domSettleTimeoutMs?: number;
  /** Enable experimental features. */
  experimental?: boolean;
  /** Default Browserbase session creation parameters. */
  browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
}

export interface SessionInfo {
  sessionId: string;
  cdpUrl?: string;
}

/**
 * Parameters for creating a Browserbase session.
 * @see https://stagehand.stldocs.app/api/resources/sessions/methods/start
 */
export interface BrowserbaseSessionCreateParams {
  projectId?: string;
  browserSettings?: {
    advancedStealth?: boolean;
    blockAds?: boolean;
    context?: {
      id: string;
      persist?: boolean;
    };
    extensionId?: string;
    fingerprint?: {
      browsers?: ("chrome" | "edge" | "firefox" | "safari")[];
      devices?: ("desktop" | "mobile")[];
      httpVersion?: "1" | "2";
      locales?: string[];
      operatingSystems?: (
        | "android"
        | "ios"
        | "linux"
        | "macos"
        | "windows"
      )[];
      screen?: {
        maxHeight?: number;
        maxWidth?: number;
        minHeight?: number;
        minWidth?: number;
      };
    };
    logSession?: boolean;
    recordSession?: boolean;
    solveCaptchas?: boolean;
    viewport?: {
      height?: number;
      width?: number;
    };
  };
  extensionId?: string;
  keepAlive?: boolean;
  proxies?:
    | boolean
    | Array<{
        type: "browserbase" | "external";
        domainPattern?: string;
        geolocation?: {
          country: string;
          city?: string;
          state?: string;
        };
        server?: string;
        password?: string;
        username?: string;
      }>;
  region?: "us-west-2" | "us-east-1" | "eu-central-1" | "ap-southeast-1";
  timeout?: number;
  userMetadata?: Record<string, unknown>;
}

export interface StartSessionOptions {
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  domSettleTimeoutMs?: number;
  selfHeal?: boolean;
  systemPrompt?: string;
  verbose?: 0 | 1 | 2;
  experimental?: boolean;
}

export interface ExtractOptions {
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  model?: string | ModelConfig;
  selector?: string;
}

export interface ActOptions {
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  model?: string | ModelConfig;
  variables?: Record<string, string>;
}

export interface ObserveOptions {
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  model?: string | ModelConfig;
  selector?: string;
}

export interface AgentOptions {
  cua?: boolean;
  mode?: "dom" | "hybrid" | "cua";
  maxSteps?: number;
  systemPrompt?: string;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  model?: string | ModelConfig;
  executionModel?: string | ModelConfig;
  provider?: "openai" | "anthropic" | "google" | "microsoft";
  highlightCursor?: boolean;
  shouldCache?: boolean;
}

export interface ObservedAction {
  description: string;
  selector: string;
  method?: string;
  arguments?: string[];
  backendNodeId?: number;
}

export interface ActResult {
  success: boolean;
  message: string;
  actionDescription: string;
}

export interface AgentAction {
  type: string;
  action?: string;
  reasoning?: string;
  timeMs?: number;
  taskCompleted?: boolean;
  pageText?: string;
  pageUrl?: string;
  instruction?: string;
}

export interface AgentUsage {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  inference_time_ms: number;
}

export interface AgentResult {
  actions: AgentAction[];
  completed: boolean;
  message: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  usage?: AgentUsage;
}

/**
 * Stagehand client for AI-powered browser automation.
 *
 * @example
 * ```typescript
 * import { Stagehand } from "convex-stagehand";
 * import { components } from "./_generated/api";
 *
 * const stagehand = new Stagehand(components.stagehand, {
 *   browserbaseApiKey: process.env.BROWSERBASE_API_KEY!,
 *   browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID!,
 *   modelApiKey: process.env.MODEL_API_KEY!,
 * });
 *
 * export const scrape = action({
 *   handler: async (ctx) => {
 *     return await stagehand.extract(ctx, {
 *       url: "https://example.com",
 *       instruction: "Extract all product names",
 *       schema: z.object({ products: z.array(z.string()) }),
 *     });
 *   },
 * });
 * ```
 */
export class Stagehand {
  constructor(
    private component: ComponentApi,
    private config: StagehandConfig,
  ) {}

  /** Credentials sent as action args for every API call. */
  private get credentials() {
    return {
      browserbaseApiKey: this.config.browserbaseApiKey,
      browserbaseProjectId: this.config.browserbaseProjectId,
      modelApiKey: this.config.modelApiKey,
      modelName: this.config.model?.modelName ?? this.config.modelName,
    };
  }

  /** Session-level config forwarded to ephemeral sessions. */
  private get sessionConfig() {
    return {
      domSettleTimeoutMs: this.config.domSettleTimeoutMs,
      selfHeal: this.config.selfHeal,
      systemPrompt: this.config.systemPrompt,
      verbose: this.config.verbose,
      experimental: this.config.experimental,
    };
  }

  /** Resolve per-operation model: per-call override > constructor config > undefined. */
  private resolveModel(override?: string | ModelConfig): string | ModelConfig | undefined {
    if (override !== undefined) return override;
    if (this.config.model) return this.config.model;
    return undefined;
  }

  /**
   * Start a new browser session.
   * Returns session info including cdpUrl for direct Playwright/Puppeteer connection.
   *
   * @param ctx - Convex action context
   * @param args - Session parameters
   * @returns Session info with sessionId and cdpUrl
   *
   * @example
   * ```typescript
   * const session = await stagehand.startSession(ctx, {
   *   url: "https://example.com",
   * });
   * // Use session.sessionId with other operations
   * // Or connect Playwright: puppeteer.connect({ browserWSEndpoint: session.cdpUrl })
   * ```
   */
  async startSession(
    ctx: ActionCtx,
    args: {
      url: string;
      browserbaseSessionID?: string;
      browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
      options?: StartSessionOptions;
    },
  ): Promise<SessionInfo> {
    return ctx.runAction(this.component.lib.startSession as any, {
      ...this.credentials,
      url: args.url,
      browserbaseSessionID: args.browserbaseSessionID,
      browserbaseSessionCreateParams:
        args.browserbaseSessionCreateParams ??
        this.config.browserbaseSessionCreateParams,
      model: this.resolveModel(),
      options: {
        domSettleTimeoutMs: this.config.domSettleTimeoutMs,
        selfHeal: this.config.selfHeal,
        systemPrompt: this.config.systemPrompt,
        verbose: this.config.verbose,
        experimental: this.config.experimental,
        ...args.options,
      },
    });
  }

  /**
   * End a browser session.
   *
   * @param ctx - Convex action context
   * @param args - Session to end
   * @returns Success status
   *
   * @example
   * ```typescript
   * await stagehand.endSession(ctx, { sessionId: session.sessionId });
   * ```
   */
  async endSession(
    ctx: ActionCtx,
    args: {
      sessionId: string;
    },
  ): Promise<{ success: boolean }> {
    return ctx.runAction(this.component.lib.endSession as any, {
      ...this.credentials,
      sessionId: args.sessionId,
    });
  }

  /**
   * Extract structured data from a web page using AI.
   *
   * @param ctx - Convex action context
   * @param args - Extraction parameters
   * @returns Extracted data matching the provided schema
   *
   * @example
   * ```typescript
   * // Without session (creates and destroys its own)
   * const data = await stagehand.extract(ctx, {
   *   url: "https://news.ycombinator.com",
   *   instruction: "Extract the top 5 stories with title and score",
   *   schema: z.object({
   *     stories: z.array(z.object({
   *       title: z.string(),
   *       score: z.string(),
   *     }))
   *   }),
   * });
   *
   * // With existing session (reuses session)
   * const data = await stagehand.extract(ctx, {
   *   sessionId: session.sessionId,
   *   instruction: "Extract the top 5 stories",
   *   schema: z.object({ ... }),
   * });
   * ```
   */
  async extract<T extends z.ZodType>(
    ctx: ActionCtx,
    args: {
      sessionId?: string;
      url?: string;
      instruction: string;
      schema: T;
      browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
      options?: ExtractOptions;
    },
  ): Promise<z.infer<T>> {
    const jsonSchema: any = zodToJsonSchema(args.schema);
    // Remove $schema field as it's reserved in Convex
    delete jsonSchema.$schema;
    return ctx.runAction(this.component.lib.extract as any, {
      ...this.credentials,
      sessionId: args.sessionId,
      url: args.url,
      instruction: args.instruction,
      schema: jsonSchema,
      browserbaseSessionCreateParams:
        args.browserbaseSessionCreateParams ??
        this.config.browserbaseSessionCreateParams,
      model: this.resolveModel(args.options?.model),
      sessionConfig: this.sessionConfig,
      options: {
        timeout: args.options?.timeout,
        waitUntil: args.options?.waitUntil,
        selector: args.options?.selector,
      },
    });
  }

  /**
   * Execute a browser action using natural language.
   *
   * @param ctx - Convex action context
   * @param args - Action parameters
   * @returns Result of the action
   *
   * @example
   * ```typescript
   * // Without session
   * const result = await stagehand.act(ctx, {
   *   url: "https://example.com/login",
   *   action: "Click the login button",
   * });
   *
   * // With existing session
   * const result = await stagehand.act(ctx, {
   *   sessionId: session.sessionId,
   *   action: "Click the submit button",
   * });
   * ```
   */
  async act(
    ctx: ActionCtx,
    args: {
      sessionId?: string;
      url?: string;
      action: string;
      browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
      options?: ActOptions;
    },
  ): Promise<ActResult> {
    return ctx.runAction(this.component.lib.act as any, {
      ...this.credentials,
      sessionId: args.sessionId,
      url: args.url,
      action: args.action,
      browserbaseSessionCreateParams:
        args.browserbaseSessionCreateParams ??
        this.config.browserbaseSessionCreateParams,
      model: this.resolveModel(args.options?.model),
      sessionConfig: this.sessionConfig,
      options: {
        timeout: args.options?.timeout,
        waitUntil: args.options?.waitUntil,
        variables: args.options?.variables,
      },
    });
  }

  /**
   * Find available actions on a web page.
   *
   * @param ctx - Convex action context
   * @param args - Observe parameters
   * @returns List of available actions
   *
   * @example
   * ```typescript
   * const actions = await stagehand.observe(ctx, {
   *   url: "https://example.com",
   *   instruction: "Find all navigation links",
   * });
   * ```
   */
  async observe(
    ctx: ActionCtx,
    args: {
      sessionId?: string;
      url?: string;
      instruction: string;
      browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
      options?: ObserveOptions;
    },
  ): Promise<ObservedAction[]> {
    return ctx.runAction(this.component.lib.observe as any, {
      ...this.credentials,
      sessionId: args.sessionId,
      url: args.url,
      instruction: args.instruction,
      browserbaseSessionCreateParams:
        args.browserbaseSessionCreateParams ??
        this.config.browserbaseSessionCreateParams,
      model: this.resolveModel(args.options?.model),
      sessionConfig: this.sessionConfig,
      options: {
        timeout: args.options?.timeout,
        waitUntil: args.options?.waitUntil,
        selector: args.options?.selector,
      },
    });
  }

  /**
   * Execute autonomous multi-step browser automation using an AI agent.
   * The agent interprets the instruction and decides what actions to take.
   *
   * @param ctx - Convex action context
   * @param args - Agent parameters
   * @returns Agent execution result with actions taken
   *
   * @example
   * ```typescript
   * // Agent creates its own session
   * const result = await stagehand.agent(ctx, {
   *   url: "https://google.com",
   *   instruction: "Search for 'convex database' and extract the top 3 results",
   *   options: { maxSteps: 10 },
   * });
   *
   * // Agent with existing session
   * const result = await stagehand.agent(ctx, {
   *   sessionId: session.sessionId,
   *   instruction: "Fill out the form and submit",
   *   options: { maxSteps: 5 },
   * });
   * ```
   */
  async agent(
    ctx: ActionCtx,
    args: {
      sessionId?: string;
      url?: string;
      instruction: string;
      browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
      options?: AgentOptions;
    },
  ): Promise<AgentResult> {
    return ctx.runAction(this.component.lib.agent as any, {
      ...this.credentials,
      sessionId: args.sessionId,
      url: args.url,
      instruction: args.instruction,
      browserbaseSessionCreateParams:
        args.browserbaseSessionCreateParams ??
        this.config.browserbaseSessionCreateParams,
      model: this.resolveModel(args.options?.model),
      sessionConfig: this.sessionConfig,
      options: {
        cua: args.options?.cua,
        mode: args.options?.mode,
        maxSteps: args.options?.maxSteps,
        systemPrompt: args.options?.systemPrompt,
        timeout: args.options?.timeout,
        waitUntil: args.options?.waitUntil,
        executionModel: args.options?.executionModel,
        provider: args.options?.provider,
        highlightCursor: args.options?.highlightCursor,
        shouldCache: args.options?.shouldCache,
      },
    });
  }
}

export default Stagehand;
