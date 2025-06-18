import { render } from "@react-email/render";
import { logger, schedules, task, wait } from "@trigger.dev/sdk/v3";
import { OpenAI } from "openai";
import puppeteer from "puppeteer-core";
import { Resend } from "resend";
import { HNSummaryEmail } from "./summarize-hn-email";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// Parent task (scheduled)
export const summarizeHackerNews = schedules.task({
  id: "summarize-hacker-news",
  cron: {
    pattern: "0 9 * * 1-5",
    timezone: "Europe/London",
  }, // Run at 9 AM, Monday to Friday
  run: async () => {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}`,
    });
    logger.info("Connected to Browserbase");

    const page = await browser.newPage();

    // Navigate to Hacker News and scrape top 3 articles
    await page.goto("https://news.ycombinator.com/news", {
      waitUntil: "networkidle0",
    });
    logger.info("Navigated to Hacker News");

    const articles = await page.evaluate(() => {
      const items = document.querySelectorAll(".athing");
      return Array.from(items)
        .slice(0, 3)
        .map((item) => {
          const titleElement = item.querySelector(".titleline > a");
          const link = titleElement?.getAttribute("href");
          const title = titleElement?.textContent;
          return { title, link };
        });
    });
    logger.info("Scraped top 3 articles", { articles });

    await browser.close();
    await wait.for({ seconds: 5 });

    // Use batchTriggerAndWait to process articles
    const summaries = await scrapeAndSummarizeArticle
      .batchTriggerAndWait(
        articles.map((article) => ({
          payload: { title: article.title!, link: article.link! },
          idempotencyKey: article.link,
        }))
      )
      .then((batch) =>
        batch.runs.filter((run) => run.ok).map((run) => run.output)
      );

    // Send email using Resend
    await resend.emails.send({
      from: "Hacker News Summary <hi@demo.tgr.dev>",
      to: ["james@trigger.dev"],
      subject: "Your morning HN summary",
      html: render(<HNSummaryEmail articles={summaries} />),
    });

    logger.info("Email sent successfully");
  },
});

// Child task for scraping and summarizing individual articles
export const scrapeAndSummarizeArticle = task({
  id: "scrape-and-summarize-articles",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async ({ title, link }: { title: string; link: string }) => {
    logger.info(`Summarizing ${title}`);

    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}`,
    });
    const page = await browser.newPage();

    // Prevent all assets from loading, images, stylesheets etc
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (
        ["script", "stylesheet", "image", "media", "font"].includes(
          request.resourceType()
        )
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(link, { waitUntil: "networkidle0" });
    logger.info(`Navigated to article: ${title}`);

    // Extract the main content of the article
    const content = await page.evaluate(() => {
      const articleElement = document.querySelector("article") || document.body;
      return articleElement.innerText.trim().slice(0, 1500); // Limit to 1500 characters
    });

    await browser.close();

    logger.info(`Extracted content for article: ${title}`, { content });

    // Summarize the content using ChatGPT
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Summarize this article in 2-3 concise sentences:\n\n${content}`,
        },
      ],
    });

    logger.info(`Generated summary for article: ${title}`);

    return {
      title,
      link,
      summary: response.choices[0].message.content,
    };
  },
});
