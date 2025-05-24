import { NextResponse } from "next/server";
import Browserbase from "@browserbasehq/sdk";
import puppeteer from "puppeteer-core";

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

    // Navigate to URL and capture screenshot
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const screenshot = await page.screenshot();
    await browser.close();

    // Set appropriate headers for image response
    const headers = new Headers();
    headers.set("Content-Type", "image/png");
    headers.set("Content-Length", screenshot.byteLength.toString());

    // Return screenshot as binary response
    return new NextResponse(screenshot, { status: 200, headers });
  } catch (error) {
    console.error("Screenshot generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate screenshot",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
