import { NextResponse } from "next/server";
import { getDemoSnapshot } from "../../../../lib/demo-controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const demoId = url.searchParams.get("demoId");

  if (!demoId) {
    return NextResponse.json({ error: "Missing demoId." }, { status: 400 });
  }

  return NextResponse.json(getDemoSnapshot(demoId));
}
