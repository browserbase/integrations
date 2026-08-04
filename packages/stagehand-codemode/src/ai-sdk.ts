import { tool, type Tool } from 'ai';
import {
  StagehandCodeExecutor,
  type StagehandCodeExecutorOptions,
} from './executor.js';
import {
  CODE_EXECUTE_DESCRIPTION,
  codeExecuteSchema,
} from './tool-contract.js';

export type StagehandToolBinding = {
  tool: Tool;
  close(): Promise<void>;
};

export function createStagehandTool(
  options: StagehandCodeExecutorOptions
): StagehandToolBinding {
  const executor = new StagehandCodeExecutor(options);
  const stagehandTool = tool({
    description: CODE_EXECUTE_DESCRIPTION,
    inputSchema: codeExecuteSchema,
    execute: (input, execution) =>
      executor.execute(input, execution.abortSignal),
  });
  return {
    tool: stagehandTool,
    close: () => executor.close(),
  };
}
