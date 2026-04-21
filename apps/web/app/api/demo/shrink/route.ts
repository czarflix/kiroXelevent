import { demoDataset, shrinkTranscript } from "@voicegauntlet/core";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { runId?: string };
  const run = demoDataset.runs.find((item) => item.id === body.runId) ?? demoDataset.runs[0]!;
  return NextResponse.json({ failure: shrinkTranscript(run) });
}
