import { NextResponse } from "next/server";
import Browserbase from "@browserbasehq/sdk";
import { Stagehand, ObserveResult, LogLine } from "@browserbasehq/stagehand";

// API route handler for GET requests
export async function GET() {
  try {
    const url = "https://file.1040.com/estimate/";
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Create a Browserbase instance
    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

    // Create a session
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
      },
    });

    // Initialize Stagehand
    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      modelName: "claude-3-5-sonnet-20240620",
      browserbaseSessionID: session.id,
      logger: (logLine: LogLine) => {
        console.log(`[${logLine.category}] ${logLine.message}`);
      },
    });
    await stagehand.init();

    // Block manifest worker to prevent PWA installation popup if needed
    await stagehand.page.route("**/manifest.json", (route) => route.abort());

    // Go to the provided URL and wait for it to load
    await stagehand.page.goto(url, {
      waitUntil: "domcontentloaded",
    });

    // Observe the form fields with suggested actions
    const observed = await stagehand.page.observe({
      instruction:
        "fill all the form fields in the page with mock data. In the description include the field name",
      returnAction: true,
    });

    // Create a mapping of keywords in the form fields to standardize field names
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

    // Sample data for form filling
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

    // Map observed fields to user inputs
    const updatedFields = observed.map((candidate: ObserveResult) => {
      const key = mapping(candidate.description);
      if (key && userInputs[key]) {
        candidate.arguments = [userInputs[key]];
      }
      return candidate;
    });

    // Fill all the form fields with the mapped candidates
    for (const candidate of updatedFields) {
      await stagehand.page.act(candidate);
    }

    // Return the results
    console.log(updatedFields);

    // Close the browser
    await stagehand.close();

    // Return the url and the fields that were filled
    return NextResponse.json({
      url: url,
      fields: updatedFields.map((field) => ({
        name: field.description,
        value: field.arguments?.[0] || null,
      })),
      count: updatedFields.length,
    });
  } catch (error) {
    // Log the error to console
    console.error("Form filling error:", error);

    // Return error response with message and error details
    return NextResponse.json(
      {
        message: "Failed to fill form",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
