import {
  demoDataset,
  evaluateTranscript,
  generateScenarioSuite,
  parseKiroRequirements,
  refineScenariosWithGroq,
  simulateConversation,
  shrinkTranscript
} from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/auth";
import { persistLiveRun } from "../../../../lib/live-persistence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    specMarkdown?: string;
    sourcePath?: string;
    scenarioId?: string;
    agentId?: string;
    useGroq?: boolean;
  };

  const requirements = parseKiroRequirements(
    body.specMarkdown ?? demoDataset.specMarkdown,
    body.sourcePath ?? ".kiro/specs/refundbot-demo/requirements.md"
  );
  const deterministic = generateScenarioSuite(requirements, 20);
  const scenarioToRefine = deterministic.find((item) => item.id === body.scenarioId) ?? deterministic[0];
  const refinement =
    scenarioToRefine && body.useGroq !== false
      ? await refineScenariosWithGroq({
          requirements,
          scenarios: [scenarioToRefine],
          ...(process.env.GROQ_API_KEY === undefined ? {} : { apiKey: process.env.GROQ_API_KEY })
        })
      : { scenarios: scenarioToRefine ? [scenarioToRefine] : [], source: "deterministic_fallback" as const };
  const refinedScenario = refinement.scenarios[0];
  const scenarios = refinedScenario ? deterministic.map((item) => (item.id === refinedScenario.id ? refinedScenario : item)) : deterministic;
  const scenario = refinedScenario ?? scenarios.find((item) => item.id === body.scenarioId) ?? scenarios[0];

  if (!scenario) {
    return NextResponse.json({ error: "No scenario could be generated from the spec." }, { status: 422 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = body.agentId ?? process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json({
      requirements,
      scenarios,
      source: refinement.source,
      warning: refinement.warning ?? "Generated scenarios only. Configure ElevenLabs credentials to run live simulation."
    });
  }

  try {
    const requirement = requirements.find((item) => item.id === scenario.requirementId);
    const extraEvaluationCriteria = requirement?.acceptance.map((acceptance, index) => ({
      id: `${requirement.id}-VG-${String(index + 1).padStart(2, "0")}`,
      name: `${requirement.id} acceptance ${index + 1}`,
      conversation_goal_prompt: acceptance,
      use_knowledge_base: false
    }));
    const simulation = await simulateConversation({
      apiKey,
      agentId,
      scenario,
      turnsLimit: 8,
      ...(extraEvaluationCriteria === undefined ? {} : { extraEvaluationCriteria })
    });
    const run = {
      ...evaluateTranscript(scenario, simulation.transcript),
      runSource: "elevenlabs_simulation" as const,
      providerRaw: simulation.raw,
      warnings: refinement.warning ? [refinement.warning] : []
    };
    const failure = run.status === "failed" ? shrinkTranscript(run) : null;
    const persisted = await persistLiveRun({
      userId: auth.user.id,
      sourcePath: body.sourcePath ?? ".kiro/specs/refundbot-demo/requirements.md",
      specMarkdown: body.specMarkdown ?? demoDataset.specMarkdown,
      requirements,
      scenarios,
      run,
      failure
    });

    return NextResponse.json({
      requirements,
      scenarios,
      run,
      failure,
      persisted,
      source: "elevenlabs_simulation",
      scenarioSource: refinement.source,
      warning: refinement.warning
    });
  } catch (error) {
    return NextResponse.json(
      {
        requirements,
        scenarios,
        error: error instanceof Error ? error.message : "ElevenLabs simulation failed.",
        source: "elevenlabs_simulation",
        scenarioSource: refinement.source,
        warning: refinement.warning
      },
      { status: 502 }
    );
  }
}
