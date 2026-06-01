import { NextResponse } from "next/server";
import { z } from "zod";
import { runDemoInstruction } from "../../../../lib/demo-controller";

export const runtime = "nodejs";

const bodySchema = z.object({
  demoId: z.string().uuid(),
  instruction: z.string().min(3),
  interrupt: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.parse(await request.json());
    const snapshot = await runDemoInstruction(parsed);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo control failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
