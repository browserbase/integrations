/**
 * Stagehand REST API Client
 *
 * Wraps the Stagehand API at https://api.stagehand.browserbase.com
 * Wire format matches the OpenAPI spec defined in stagehand/packages/core/lib/v3/types/public/api.ts
 */

export type BrowserbaseRegion =
  | "us-west-2"
  | "us-east-1"
  | "eu-central-1"
  | "ap-southeast-1";

export interface BrowserbaseSessionCreateParams {
  region?: BrowserbaseRegion;
}

/** Multi-region API URL mapping (matches official SDK) */
const REGION_API_URLS: Record<BrowserbaseRegion, string> = {
  "us-west-2": "https://api.stagehand.browserbase.com",
  "us-east-1": "https://api.use1.stagehand.browserbase.com",
  "eu-central-1": "https://api.euc1.stagehand.browserbase.com",
  "ap-southeast-1": "https://api.apse1.stagehand.browserbase.com",
};

export function getApiBase(region?: BrowserbaseRegion): string {
  const baseUrl =
    (region && REGION_API_URLS[region]) ||
    REGION_API_URLS["us-west-2"];
  return `${baseUrl}/v1`;
}

export interface ApiConfig {
  browserbaseApiKey: string;
  browserbaseProjectId: string;
  modelApiKey: string;
  modelName?: string;
}

/** Matches SessionStartResult from the OpenAPI spec */
export interface SessionData {
  sessionId: string;
  cdpUrl?: string | null;
  available: boolean;
}

export interface StartSessionOptions {
  browserbaseSessionID?: string;
  browserbaseSessionCreateParams?: BrowserbaseSessionCreateParams;
  model?: unknown;
  domSettleTimeoutMs?: number;
  selfHeal?: boolean;
  systemPrompt?: string;
  verbose?: 0 | 1 | 2;
  experimental?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

function getHeaders(config: ApiConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-bb-api-key": config.browserbaseApiKey,
    "x-bb-project-id": config.browserbaseProjectId,
    "x-model-api-key": config.modelApiKey,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Stagehand API error (${response.status}): ${errorText}`,
    );
  }
  const json = (await response.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(`Stagehand API returned success: false`);
  }
  return json.data;
}

/** POST /v1/sessions/start — matches SessionStartRequest schema */
export async function startSession(
  config: ApiConfig,
  options?: StartSessionOptions,
): Promise<SessionData> {
  const region = options?.browserbaseSessionCreateParams?.region;
  const response = await fetch(
    `${getApiBase(region)}/sessions/start`,
    {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify({
        modelName: config.modelName || "openai/gpt-4o",
        model: options?.model,
        browserbaseSessionID: options?.browserbaseSessionID,
        browserbaseSessionCreateParams:
          options?.browserbaseSessionCreateParams,
        domSettleTimeoutMs: options?.domSettleTimeoutMs,
        selfHeal: options?.selfHeal,
        systemPrompt: options?.systemPrompt,
        verbose: options?.verbose,
        experimental: options?.experimental,
      }),
    },
  );
  return handleResponse<SessionData>(response);
}

/** POST /v1/sessions/{id}/end */
export async function endSession(
  sessionId: string,
  config: ApiConfig,
  region?: BrowserbaseRegion,
): Promise<void> {
  const response = await fetch(`${getApiBase(region)}/sessions/${sessionId}/end`, {
    method: "POST",
    headers: getHeaders(config),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stagehand API error (${response.status}): ${errorText}`);
  }
  const text = await response.text();
  if (text) {
    const json = JSON.parse(text) as { success?: boolean };
    if (json.success === false) {
      throw new Error("Stagehand API returned success: false");
    }
  }
}

/** Matches NavigateOptions from the OpenAPI spec */
export interface NavigateOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  timeout?: number;
  referer?: string;
}

/** POST /v1/sessions/{id}/navigate — matches NavigateRequest schema */
export async function navigate(
  sessionId: string,
  url: string,
  config: ApiConfig,
  options?: NavigateOptions,
  region?: BrowserbaseRegion,
): Promise<void> {
  const response = await fetch(
    `${getApiBase(region)}/sessions/${sessionId}/navigate`,
    {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify({
        url,
        options: {
          waitUntil: options?.waitUntil || "networkidle",
          timeout: options?.timeout,
          referer: options?.referer,
        },
      }),
    },
  );
  await handleResponse(response);
}

export interface ExtractResult<T = unknown> {
  result: T;
  actionId?: string;
}

/** Matches ExtractOptions from the OpenAPI spec */
export interface ExtractOperationOptions {
  model?: unknown;
  timeout?: number;
  selector?: string;
}

/** POST /v1/sessions/{id}/extract — matches ExtractRequest schema */
export async function extract(
  sessionId: string,
  instruction: string,
  schema: unknown,
  config: ApiConfig,
  operationOptions?: ExtractOperationOptions,
  region?: BrowserbaseRegion,
): Promise<ExtractResult> {
  const body: Record<string, unknown> = { instruction, schema };
  if (
    operationOptions?.model != null ||
    operationOptions?.timeout != null ||
    operationOptions?.selector != null
  ) {
    body.options = {
      model: operationOptions?.model,
      timeout: operationOptions?.timeout,
      selector: operationOptions?.selector,
    };
  }
  const response = await fetch(
    `${getApiBase(region)}/sessions/${sessionId}/extract`,
    {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify(body),
    },
  );
  return handleResponse<ExtractResult>(response);
}

/** Matches ActResultData from the OpenAPI spec */
export interface ActResult {
  result: {
    actionDescription: string;
    actions: Array<{
      description: string;
      selector: string;
      arguments?: string[];
      method?: string;
      backendNodeId?: number;
    }>;
    message: string;
    success: boolean;
  };
  actionId?: string;
}

/** Matches ActOptions from the OpenAPI spec */
export interface ActOperationOptions {
  model?: unknown;
  variables?: Record<string, string>;
  timeout?: number;
}

/** POST /v1/sessions/{id}/act — matches ActRequest schema */
export async function act(
  sessionId: string,
  action: string,
  config: ApiConfig,
  operationOptions?: ActOperationOptions,
  region?: BrowserbaseRegion,
): Promise<ActResult> {
  const body: Record<string, unknown> = { input: action };
  if (
    operationOptions?.model != null ||
    operationOptions?.variables != null ||
    operationOptions?.timeout != null
  ) {
    body.options = {
      model: operationOptions?.model,
      variables: operationOptions?.variables,
      timeout: operationOptions?.timeout,
    };
  }
  const response = await fetch(
    `${getApiBase(region)}/sessions/${sessionId}/act`,
    {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify(body),
    },
  );
  return handleResponse<ActResult>(response);
}

/** Matches ObserveResult from the OpenAPI spec (Action schema) */
export interface ObserveResult {
  result: Array<{
    description: string;
    selector: string;
    arguments?: string[];
    backendNodeId?: number;
    method?: string;
  }>;
  actionId?: string;
}

/** Matches ObserveOptions from the OpenAPI spec */
export interface ObserveOperationOptions {
  model?: unknown;
  timeout?: number;
  selector?: string;
}

/** POST /v1/sessions/{id}/observe — matches ObserveRequest schema */
export async function observe(
  sessionId: string,
  instruction: string,
  config: ApiConfig,
  operationOptions?: ObserveOperationOptions,
  region?: BrowserbaseRegion,
): Promise<ObserveResult> {
  const body: Record<string, unknown> = { instruction };
  if (
    operationOptions?.model != null ||
    operationOptions?.timeout != null ||
    operationOptions?.selector != null
  ) {
    body.options = {
      model: operationOptions?.model,
      timeout: operationOptions?.timeout,
      selector: operationOptions?.selector,
    };
  }
  const response = await fetch(
    `${getApiBase(region)}/sessions/${sessionId}/observe`,
    {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify(body),
    },
  );
  return handleResponse<ObserveResult>(response);
}

/** Matches AgentConfig from the OpenAPI spec */
export interface AgentConfig {
  cua?: boolean;
  mode?: "dom" | "hybrid" | "cua";
  model?: unknown;
  systemPrompt?: string;
  executionModel?: unknown;
  provider?: "openai" | "anthropic" | "google" | "microsoft";
}

/** Matches AgentExecuteOptions from the OpenAPI spec */
export interface AgentExecuteOptions {
  instruction: string;
  maxSteps?: number;
  highlightCursor?: boolean;
}

/** Matches AgentAction from the OpenAPI spec */
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

/** Matches AgentUsage from the OpenAPI spec */
export interface AgentUsage {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
  cached_input_tokens?: number;
  inference_time_ms: number;
}

/** Matches AgentExecuteResult from the OpenAPI spec */
export interface AgentExecuteResult {
  result: {
    actions: AgentAction[];
    completed: boolean;
    message: string;
    success: boolean;
    metadata?: Record<string, unknown>;
    usage?: AgentUsage;
  };
}

/** POST /v1/sessions/{id}/agentExecute — matches AgentExecuteRequest schema */
export async function agentExecute(
  sessionId: string,
  agentConfig: AgentConfig,
  executeOptions: AgentExecuteOptions,
  config: ApiConfig,
  shouldCache?: boolean,
  region?: BrowserbaseRegion,
): Promise<AgentExecuteResult> {
  const response = await fetch(
    `${getApiBase(region)}/sessions/${sessionId}/agentExecute`,
    {
      method: "POST",
      headers: getHeaders(config),
      body: JSON.stringify({
        agentConfig: {
          cua: agentConfig.cua,
          mode: agentConfig.mode,
          model: agentConfig.model,
          systemPrompt: agentConfig.systemPrompt,
          executionModel: agentConfig.executionModel,
          provider: agentConfig.provider,
        },
        executeOptions: {
          instruction: executeOptions.instruction,
          maxSteps: executeOptions.maxSteps,
          highlightCursor: executeOptions.highlightCursor,
        },
        shouldCache,
      }),
    },
  );
  return handleResponse<AgentExecuteResult>(response);
}
