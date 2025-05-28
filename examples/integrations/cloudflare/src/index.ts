/** This is an example of how to use Browserbase with Cloudflare Workers. */
import puppeteer from '@cloudflare/puppeteer';

interface Env {
  BROWSERBASE_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.browserbase.com?apiKey=${env.BROWSERBASE_API_KEY}`,
    });

    const pages = await browser.pages();
    const page = pages[0];
    await page.goto('https://www.browserbase.com');

    const currentUrl = page.url();

    await page.close();
    await browser.close();
    return new Response(JSON.stringify({ currentUrl }), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
