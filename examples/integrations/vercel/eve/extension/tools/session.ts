import { defineDynamic, defineTool } from 'eve/tools';
import { z } from 'zod';

import { closeBrowserSession, createBrowserSession } from '../lib/stagehand';

export default defineDynamic({
  events: {
    'session.started': () => ({
      create_session: defineTool({
        description:
          'Create a Browserbase browser session for this Eve conversation, or reconnect if one already exists.',
        inputSchema: z.object({}),
        async execute() {
          const session = await createBrowserSession();
          return { ...session, created: Boolean(session.id) };
        },
      }),
      stop_session: defineTool({
        description:
          'Stop the Browserbase browser session for this Eve conversation and release its resources.',
        inputSchema: z.object({}),
        async execute() {
          const session = await closeBrowserSession();
          return { ...session, stopped: Boolean(session.id) };
        },
      }),
    }),
  },
});
