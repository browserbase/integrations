/**
 * Browserbase × Arize AX example — an OpenAI agent that calls a Browserbase
 * `load_page` tool to browse the web, traced with OpenInference to Arize AX as a
 * CHAIN (agent) → LLM → TOOL (load_page) span tree.
 */

// Load .env first, then set up tracing. Instrumentation must be imported before
// `openai` — OpenInference only traces code that runs after it's registered.
// Importing `provider` also runs that setup and gives us a handle for flushing.
import "dotenv/config";
import { provider } from "./instrumentation";

import OpenAI from "openai";
import Browserbase from "@browserbasehq/sdk";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  MimeType,
  OpenInferenceSpanKind,
  SemanticConventions,
} from "@arizeai/openinference-semantic-conventions";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const BROWSERBASE_API_KEY = requireEnv("BROWSERBASE_API_KEY");
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4";
const MAX_SPAN_CHARS = 4000; // page text kept on the span
const MAX_TOOL_CHARS = 8000; // page text returned to the model
const MAX_STEPS = 5;

const tracer = trace.getTracer("browserbase-arize-agent");
const openai = new OpenAI();

// Fetch a page's content via the Browserbase Fetch API and return it as markdown,
// wrapped in a manual OpenInference TOOL span so the fetch appears as a tool call
// in the AX trace. The Fetch API returns clean content over HTTP — no browser
// session needed for simple content retrieval.
async function loadPage({ url }: { url: string }): Promise<string> {
  return tracer.startActiveSpan("load_page", async (span) => {
    span.setAttributes({
      [SemanticConventions.OPENINFERENCE_SPAN_KIND]: OpenInferenceSpanKind.TOOL,
      [SemanticConventions.TOOL_NAME]: "load_page",
      [SemanticConventions.INPUT_VALUE]: JSON.stringify({ url }),
      [SemanticConventions.INPUT_MIME_TYPE]: MimeType.JSON,
    });

    try {
      const bb = new Browserbase({ apiKey: BROWSERBASE_API_KEY });
      const res = await bb.fetchAPI.create({ url, format: "markdown" });
      // `content` is a string for markdown; fall back safely for object/empty.
      const text =
        typeof res.content === "string"
          ? res.content
          : res.content == null
            ? ""
            : JSON.stringify(res.content);

      span.setAttribute(
        SemanticConventions.OUTPUT_VALUE,
        text.slice(0, MAX_SPAN_CHARS),
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return text;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "load_page",
      description: "Load a page from the internet and return its text content.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to load." },
        },
        required: ["url"],
      },
    },
  },
];

// Standard tool-calling loop, wrapped in one CHAIN span: call the model, run any
// load_page tool calls it requests, feed results back, repeat until it answers.
async function runAgent(question: string): Promise<string> {
  return tracer.startActiveSpan("agent", async (span) => {
    span.setAttributes({
      [SemanticConventions.OPENINFERENCE_SPAN_KIND]: OpenInferenceSpanKind.CHAIN,
      [SemanticConventions.INPUT_VALUE]: question,
    });

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content:
            "You are a research assistant. Use the load_page tool to browse the " +
            "web when you need up-to-date information, then answer concisely.",
        },
        { role: "user", content: question },
      ];

      for (let step = 0; step < MAX_STEPS; step++) {
        // Force a text answer on the last step so a final tool call isn't dropped.
        const isFinalStep = step === MAX_STEPS - 1;
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages,
          tools,
          tool_choice: isFinalStep ? "none" : "auto",
        });

        const choice = completion.choices[0]?.message;
        if (!choice) throw new Error("OpenAI returned no completion choices.");
        messages.push(choice);

        // No tool calls means the model answered — return it.
        if (!choice.tool_calls?.length) {
          const answer = choice.content ?? "";
          span.setAttribute(SemanticConventions.OUTPUT_VALUE, answer);
          span.setStatus({ code: SpanStatusCode.OK });
          return answer;
        }

        // Run each requested tool; every tool_call needs a matching tool message.
        for (const toolCall of choice.tool_calls) {
          let content: string;
          if (toolCall.type === "function") {
            try {
              const result = await loadPage(
                JSON.parse(toolCall.function.arguments),
              );
              content = result.slice(0, MAX_TOOL_CHARS);
            } catch (error) {
              // Feed the error back so the model can recover instead of crashing.
              content = `Error running load_page: ${String(error)}`;
            }
          } else {
            content = `Unsupported tool call type: ${toolCall.type}`;
          }
          messages.push({ role: "tool", tool_call_id: toolCall.id, content });
        }
      }

      // Safety net — unreachable, since the final step forces a text answer.
      const message = "Reached the maximum number of tool-calling steps.";
      span.setStatus({ code: SpanStatusCode.ERROR, message });
      return message;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "What is Browserbase? Read https://www.browserbase.com and summarize it in two sentences.";

  try {
    const answer = await runAgent(question);
    console.log("\n" + answer + "\n");
  } finally {
    await provider.shutdown(); // flush spans before exit, even on error
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
