interface ClosableStagehand {
  close(): Promise<void>;
}

export async function disconnectStagehand(
  stagehand: ClosableStagehand
): Promise<void> {
  await stagehand.close().catch(() => {});
}
