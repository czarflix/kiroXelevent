import { demoDataset, evaluateTranscript, simulateConversation } from "@voicegauntlet/core";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { scenarioId?: string; agentId?: string };
  const scenario = demoDataset.scenarios.find((item) => item.id === body.scenarioId) ?? demoDataset.scenarios[0]!;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = body.agentId ?? process.env.ELEVENLABS_AGENT_ID;

  if (apiKey && agentId && body.scenarioId) {
    try {
      const simulation = await simulateConversation({ apiKey, agentId, scenario, turnsLimit: 8 });
      return NextResponse.json({ run: evaluateTranscript(scenario, simulation.transcript), source: "elevenlabs" });
    } catch (error) {
      return NextResponse.json(
        {
          run: demoDataset.runs[0],
          source: "seeded-fallback",
          warning: error instanceof Error ? error.message : "ElevenLabs simulation failed"
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ run: demoDataset.runs[0], source: "seeded" });
}
