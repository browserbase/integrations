import { logger, task } from "@trigger.dev/sdk/v3";
import puppeteer from "puppeteer";

export const puppeteerBasicTask = task({
  id: "puppeteer-log-title",
  machine: {
    preset: "large-1x",
  },
  run: async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://google.com");

    const content = await page.title();

    logger.info("Content", { content });
    await browser.close();
  },
});
