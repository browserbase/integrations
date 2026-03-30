import { NextResponse } from "next/server";
import Browserbase from "@browserbasehq/sdk";
import { Stagehand, type Action } from "@browserbasehq/stagehand";
import type { Page as PlaywrightPage } from "playwright-core";

export async function GET() {
  try {
    const url = "https://file.1040.com/estimate/";

    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
      },
    });

    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY!,
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      model: "anthropic/claude-sonnet-4-6",
      browserbaseSessionID: session.id,
    });
    await stagehand.init();

    const page = stagehand.context.pages()[0] as unknown as PlaywrightPage;

    await page.route("**/manifest.json", (route) => route.abort());

    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });

    const observed = await stagehand.observe(
      "fill all the form fields in the page with mock data. In the description include the field name"
    );

    const mapping = (description: string): string | null => {
      const keywords: { [key: string]: string[] } = {
        age: ["old", "age"],
        dependentsUnder17: ["under age 17", "child", "minor"],
        dependents17to23: ["17-23", "school", "student"],
        wages: ["wages", "W-2 Box 1", "salary", "income"],
        federalTax: ["federal tax", "Box 2"],
        stateTax: ["state tax", "Box 17"],
        name: ["name", "full name"],
        email: ["email", "e-mail"],
        phone: ["phone", "telephone", "mobile"],
        address: ["address", "street"],
        city: ["city", "town"],
        state: ["state", "province"],
        zip: ["zip", "postal", "zipcode"],
      };

      for (const [key, terms] of Object.entries(keywords)) {
        if (terms.some((term) => description.toLowerCase().includes(term))) {
          return key;
        }
      }
      return null;
    };

    const userInputs: { [key: string]: string } = {
      age: "26",
      dependentsUnder17: "1",
      dependents17to23: "0",
      wages: "54321",
      federalTax: "8345",
      stateTax: "2222",
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "555-123-4567",
      address: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip: "12345",
    };

    const updatedFields = observed.map((candidate: Action) => {
      const key = mapping(candidate.description);
      if (key && userInputs[key]) {
        candidate.arguments = [userInputs[key]];
      }
      return candidate;
    });

    for (const candidate of updatedFields) {
      await stagehand.act(candidate);
    }

    console.log(updatedFields);

    await stagehand.close();

    return NextResponse.json({
      url: url,
      fields: updatedFields.map((field: Action) => ({
        name: field.description,
        value: field.arguments?.[0] || null,
      })),
      count: updatedFields.length,
    });
  } catch (error) {
    console.error("Form filling error:", error);

    return NextResponse.json(
      {
        message: "Failed to fill form",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
