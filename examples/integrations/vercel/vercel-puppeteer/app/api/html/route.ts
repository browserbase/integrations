import { NextResponse } from "next/server";
import Browserbase from "@browserbasehq/sdk";
import puppeteer from "puppeteer-core";
import prettier from "prettier";
import htmlParser from "prettier/parser-html";

export async function GET(req: Request) {
  try {
    // Extract URL from request query parameters
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Initialize Browserbase with API key
    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

    // Create a new browser session with specified viewport
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
      },
    });

    // Connect to browser instance using Puppeteer
    const browser = await puppeteer.connect({
      browserWSEndpoint: session.connectUrl,
    });

    // Navigate to URL and capture HTML
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const html = await page.evaluate(
      () => document.querySelector("*")?.outerHTML
    );

    const formattedHtml = await prettier.format(html || "", {
      parser: "html",
      plugins: [htmlParser],
    });

    await browser.close();

    return NextResponse.json({ html: formattedHtml });
  } catch (error) {
    console.error("HTML generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate HTML",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
