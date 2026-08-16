export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2";
export const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? "marin";

export const REALTIME_INSTRUCTIONS = [
  "You are the voice interface for a live Browserbase session.",
  "Use the control_browser function whenever the user asks you to open a site, navigate, click, read, search, create, edit, or continue operating the browser.",
  "When you start a browser task, say at most one short sentence (for example 'On it.'). Do NOT describe what the browser is doing while you wait, and NEVER say a page is 'still loading' or 'still opening' — you do not receive live progress, only the final result when control_browser returns.",
  "Do not claim browser work is complete until the controller reports the result.",
  "Answer questions about page content ONLY from what control_browser returns. Never use your own background knowledge to state a fact, number, or name that should come from the page. If the result says the information was not found on the page, tell the user that plainly instead of guessing.",
  "Keep spoken updates short and concrete.",
  "If the user changes direction while the controller is working, call control_browser with interrupt set to true."
].join("\n");

export const CONTROL_BROWSER_TOOL = {
  type: "function",
  name: "control_browser",
  description: "Delegate one high-level browser instruction to the Browserbase controller.",
  parameters: {
    type: "object",
    properties: {
      instruction: {
        type: "string",
        description: "The browser task to perform next."
      },
      interrupt: {
        type: "boolean",
        description: "Whether this instruction should replace the current browser run."
      }
    },
    required: ["instruction"]
  }
};

export function buildRealtimeSessionConfig() {
  return {
    type: "realtime",
    model: REALTIME_MODEL,
    instructions: REALTIME_INSTRUCTIONS,
    output_modalities: ["audio"],
    audio: {
      input: {
        transcription: {
          model: "gpt-4o-mini-transcribe"
        }
      },
      output: {
        voice: REALTIME_VOICE
      }
    },
    tools: [CONTROL_BROWSER_TOOL],
    tool_choice: "auto"
  };
}
