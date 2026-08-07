import 'dotenv/config';

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import Browserbase from '@browserbasehq/sdk';

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

async function main() {
  const context = await browserbase.contexts.create();
  const session = await browserbase.sessions.create({
    browserSettings: {
      context: { id: context.id, persist: true },
      logSession: false,
      recordSession: false,
    },
    keepAlive: true,
    timeout: 900,
  });
  const liveView = await browserbase.sessions.debug(session.id);

  console.log(`Created Browserbase Context: ${context.id}`);
  console.log(`Open Live View: ${liveView.debuggerFullscreenUrl}`);
  console.log(`Navigate to: ${process.env.PGE_PORTAL_URL}`);
  console.log('Log in normally, including any MFA steps.');

  const prompt = createInterface({ input: stdin, output: stdout });
  await prompt.question(
    'Once the PG&E account dashboard is accessible, press Enter to save the login...'
  );
  prompt.close();

  await browserbase.sessions.update(session.id, {
    status: 'REQUEST_RELEASE',
  });

  while (true) {
    const current = await browserbase.sessions.retrieve(session.id);
    if (current.status === 'COMPLETED') {
      break;
    }
    if (['ERROR', 'TIMED_OUT'].includes(current.status)) {
      throw new Error(`Login session ended with ${current.status}.`);
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }

  await new Promise(resolve => setTimeout(resolve, 5_000));
  console.log('Login saved to the Browserbase Context.');
  console.log(`Set BROWSERBASE_CONTEXT_ID=${context.id} in .env`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
