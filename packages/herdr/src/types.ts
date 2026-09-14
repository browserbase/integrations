export type BrowserMode = 'local' | 'cloud';

export interface SessionState {
  browseSession: string;
  browserbaseSessionId?: string;
  mode: BrowserMode;
}

export interface WorkspaceState {
  contextId?: string;
  sessions: Record<string, SessionState>;
}

export interface PluginState {
  version: 1;
  workspaces: Record<string, WorkspaceState>;
}

export interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  args: string[],
  options?: { capture?: boolean }
) => Promise<CommandResult>;
