import OpenAI from "openai";
import { z } from "zod";
import type { Requirement, Scenario } from "./types";

const RefinedScenarioSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  expectedBehavior: z.string()
});

export async function refineScenarioWithOpenAI(params: {
  apiKey: string;
  model?: string;
  requirement: Requirement;
  scenario: Scenario;
}): Promise<Scenario> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const response = await client.responses.create({
    model: params.model ?? "gpt-5.4-nano",
    input: [
      {
        role: "system",
        content: "You rewrite QA scenarios for voice-agent testing. Return compact JSON only."
      },
      {
        role: "user",
        content: JSON.stringify({
          requirement: params.requirement,
          scenario: params.scenario,
          task: "Make this scenario more adversarial but still realistic. Keep it suitable for an ElevenLabs simulated user."
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "refined_scenario",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title", "prompt", "expectedBehavior"],
          properties: {
            title: { type: "string" },
            prompt: { type: "string" },
            expectedBehavior: { type: "string" }
          }
        }
      }
    }
  });

  const text = response.output_text;
  const parsed = RefinedScenarioSchema.parse(JSON.parse(text));
  return {
    ...params.scenario,
    title: parsed.title,
    prompt: parsed.prompt,
    expectedBehavior: parsed.expectedBehavior
  };
}
