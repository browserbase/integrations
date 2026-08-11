import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { withStagehand } from '../lib/stagehand';

export default defineTool({
  description:
    'Navigate the Browserbase browser to a URL. Call this before using other browser tools on a new site.',
  inputSchema: z.object({
    url: z.url().describe('The absolute URL to open.'),
  }),
  async execute({ url }, ctx) {
    return withStagehand(ctx.session.id, async stagehand => {
      const page =
        (await stagehand.browser.context.activePage()) ??
        (await stagehand.browser.context.newPage());
      await page.goto(url);
      return { url: await page.url(), title: await page.title() };
    });
  },
});
