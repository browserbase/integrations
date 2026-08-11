interface ClosableStagehand {
  close(): Promise<void>;
}

interface ClosableBrowser {
  close(): Promise<void>;
}

export async function disconnectStagehand(
  stagehand: ClosableStagehand,
  browser: ClosableBrowser
): Promise<void> {
  try {
    await stagehand.close();
  } catch {}

  try {
    await browser.close();
  } catch {}
}
