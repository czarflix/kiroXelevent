import { demoDataset } from "@voicegauntlet/core";
import { NextResponse } from "next/server";

export function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return context.params.then(({ id }) => {
    const run = demoDataset.runs.find((item) => item.id === id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  });
}
