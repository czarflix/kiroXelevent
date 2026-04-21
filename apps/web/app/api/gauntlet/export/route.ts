import { demoDataset, exportKiroFixTasks, type Failure, type Requirement, type Scenario } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/auth";
import { persistFixExport } from "../../../../lib/live-persistence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    failures?: Failure[];
    requirements?: Requirement[];
    scenarios?: Scenario[];
    persistedFailureIds?: string[];
  };
  const failures = body.failures ?? demoDataset.failures;
  const requirements = body.requirements ?? demoDataset.requirements;
  const scenarios = body.scenarios ?? demoDataset.scenarios;
  const markdown = exportKiroFixTasks(failures, requirements, scenarios);
  const persisted = await persistFixExport({
    userId: auth.user.id,
    markdown,
    failureIds: body.persistedFailureIds ?? []
  });

  return NextResponse.json({ markdown, persisted });
}
