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
        async execute(_input, ctx) {
          return createBrowserSession(ctx.session.id);
        },
      }),
      stop_session: defineTool({
        description:
          'Stop the Browserbase browser session for this Eve conversation and release its resources.',
        inputSchema: z.object({}),
        async execute(_input, ctx) {
          const session = await closeBrowserSession(ctx.session.id);
          return { ...session, stopped: Boolean(session.id) };
        },
      }),
    }),
  },
});
