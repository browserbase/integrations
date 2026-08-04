import type { StagehandCodeConfig } from './types.js';

export function stagehandCodeConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): StagehandCodeConfig {
  const explicitModelName = nonEmpty(env.STAGEHAND_MODEL_NAME);
  const explicitModelApiKey = nonEmpty(env.STAGEHAND_MODEL_API_KEY);
  const inferredGoogleKey =
    nonEmpty(env.GEMINI_API_KEY) ??
    nonEmpty(env.GOOGLE_API_KEY) ??
    nonEmpty(env.GOOGLE_GENERATIVE_AI_API_KEY);
  const modelName =
    explicitModelName ??
    (inferredGoogleKey ? 'google/gemini-2.5-flash-lite' : undefined);
  const modelApiKey = explicitModelApiKey ?? inferredGoogleKey;
  return {
    browserbaseApiKey: nonEmpty(env.BROWSERBASE_API_KEY),
    ...(modelName
      ? {
          model: {
            modelName,
            ...(modelApiKey ? { apiKey: modelApiKey } : {}),
            ...(nonEmpty(env.STAGEHAND_MODEL_BASE_URL)
              ? { baseURL: nonEmpty(env.STAGEHAND_MODEL_BASE_URL) }
              : {}),
          },
        }
      : {}),
  };
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
