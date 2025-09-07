import type { ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
false;
false;

dotenv.config();

const StagehandConfig: ConstructorParams = {
  verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeoutMs: 30_000 /* Timeout for DOM to settle in milliseconds */,

  // LLM configuration
  modelName: "claude-3-7-sonnet-20250219" /* Name of the model to use */,
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  } /* Configuration options for the model client */,

  // Browser configuration
  // env: "BROWSERBASE" /* Environment to run in: LOCAL or BROWSERBASE */,
  env: "LOCAL",
  apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
  projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
  browserbaseSessionID:
    undefined /* Session ID for resuming Browserbase sessions */,
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      blockAds: true,
      viewport: {
        width: 1024,
        height: 768,
      },
    },
  },
  localBrowserLaunchOptions: {
    viewport: {
      width: 1024,
      height: 768,
    },
  } /* Configuration options for the local browser */,
};

export default StagehandConfig;
