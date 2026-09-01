/**
 * Arize AX tracing setup.
 *
 * This file MUST be imported before any instrumented library (e.g. `openai`),
 * because OpenInference only captures spans for code that runs after the
 * instrumentation is registered. See `agent.ts`, where `import { provider } from
 * "./instrumentation"` sits at the very top of the entrypoint.
 */
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { OpenAIInstrumentation } from "@arizeai/openinference-instrumentation-openai";
import OpenAI from "openai";

const projectName = process.env.ARIZE_PROJECT_NAME ?? "browserbase-arize-agent";

// Without these, the exporter sends empty auth headers and Arize AX silently
// drops the spans — warn loudly so it isn't a mystery why nothing shows up.
if (!process.env.ARIZE_SPACE_ID || !process.env.ARIZE_API_KEY) {
  console.warn(
    "WARNING: ARIZE_SPACE_ID and/or ARIZE_API_KEY are not set — traces will not be delivered to Arize AX.",
  );
}

export const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: projectName,
    [SEMRESATTRS_PROJECT_NAME]: projectName,
  }),
  spanProcessors: [
    // SimpleSpanProcessor exports each span as it ends — nice for a demo. In
    // production prefer BatchSpanProcessor to batch exports.
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: "https://otlp.arize.com/v1/traces",
        headers: {
          "arize-space-id": process.env.ARIZE_SPACE_ID ?? "",
          "arize-api-key": process.env.ARIZE_API_KEY ?? "",
        },
      }),
    ),
  ],
});

provider.register();

// Patch the OpenAI client so every chat completion becomes an LLM span.
const instrumentation = new OpenAIInstrumentation();
instrumentation.manuallyInstrument(OpenAI);
registerInstrumentations({ instrumentations: [instrumentation] });

console.log(`Arize AX tracing initialized for project "${projectName}".`);
