export type DemoEventKind = "system" | "user" | "assistant" | "tool" | "browser" | "error";

export type DemoRunState = "idle" | "starting" | "planning" | "acting" | "ready" | "error";

export interface DemoEvent {
  id: string;
  kind: DemoEventKind;
  message: string;
  createdAt: string;
  runId?: string | null;
  speakable?: string | null;
  step?: number | null;
}

export interface DemoSessionSnapshot {
  demoId: string;
  activeRunId: string | null;
  status: DemoRunState;
  busy: boolean;
  liveViewUrl: string | null;
  browserbaseSessionId: string | null;
  claudeSessionId: string | null;
  currentUrl: string | null;
  pageTitle: string | null;
  lastInstruction: string | null;
  lastSummary: string | null;
  currentStep: string | null;
  lastNarration: string | null;
  stepCount: number;
  error: string | null;
  missingConfig: string[];
  events: DemoEvent[];
}

export interface DemoControlInput {
  demoId: string;
  instruction: string;
  interrupt?: boolean;
}

export interface DemoStartResponse {
  accepted: boolean;
  snapshot: DemoSessionSnapshot;
}
