import { evaluateTranscript, getDemoRun, getDemoScenario, shrinkTranscript, simulateConversation } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "../../../../lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { scenarioId?: string; runId?: string; agentId?: string; mode?: "seeded" | "live" };
  const scenario = getDemoScenario(body.scenarioId);
  const mode = body.mode ?? "seeded";
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = body.agentId ?? process.env.ELEVENLABS_AGENT_ID;

  if (mode !== "live") {
    const run = getDemoRun(body.runId ?? body.scenarioId);
    return NextResponse.json({
      run,
      failure: run.status === "failed" ? shrinkTranscript(run) : null,
      source: "demo_fixture"
    });
  }

  const authError = await requireAuthenticatedRequest(request);
  if (authError) {
    return authError;
  }

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: "ElevenLabs live mode requires server-side ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID." }, { status: 400 });
  }

  try {
    const simulation = await simulateConversation({ apiKey, agentId, scenario, turnsLimit: 8 });
    const run = {
      ...evaluateTranscript(scenario, simulation.transcript),
      runSource: "elevenlabs_simulation" as const,
      providerRaw: simulation.raw,
      warnings: []
    };
    return NextResponse.json({
      run,
      failure: run.status === "failed" ? shrinkTranscript(run) : null,
      source: "elevenlabs_simulation"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "ElevenLabs simulation failed",
        source: "elevenlabs_simulation"
      },
      { status: 502 }
    );
  }
}
