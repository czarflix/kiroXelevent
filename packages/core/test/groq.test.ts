import { describe, expect, it } from "vitest";
import { clearGroqScenarioCache, generateScenarios, parseKiroRequirements, refineScenarioWithGroq, refundBotRequirements } from "../src";

const requirement = parseKiroRequirements(refundBotRequirements)[0]!;
const scenario = generateScenarios([requirement], 1)[0]!;

describe("Groq scenario refinement", () => {
  it("falls back deterministically when no server-side key is available", async () => {
    const result = await refineScenarioWithGroq({
      requirement,
      scenario
    });

    expect(result.source).toBe("deterministic_fallback");
    expect(result.scenario).toEqual(scenario);
    expect(result.warning).toContain("deterministic");
  });

  it("retries one 429 and caches the successful JSON refinement", async () => {
    clearGroqScenarioCache();
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0" }
        });
      }
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Refined angry caller",
                prompt: "Escalate emotionally while still giving the agent a fair chance to verify identity.",
                expectedBehavior: "Verify identity before discussing order details."
              })
            }
          }
        ]
      });
    }) as typeof fetch;

    const first = await refineScenarioWithGroq({
      apiKey: "test-key",
      requirement,
      scenario,
      cacheKey: "test-cache-key",
      fetchImpl,
      retryDelayMs: 0
    });
    const second = await refineScenarioWithGroq({
      apiKey: "test-key",
      requirement,
      scenario,
      cacheKey: "test-cache-key",
      fetchImpl,
      retryDelayMs: 0
    });

    expect(first.source).toBe("groq");
    expect(first.scenario.title).toBe("Refined angry caller");
    expect(second.source).toBe("cache");
    expect(calls).toBe(2);
  });

  it("falls back when Groq returns invalid JSON", async () => {
    const fetchImpl = (async () =>
      Response.json({
        choices: [{ message: { content: "not json" } }]
      })) as typeof fetch;

    const result = await refineScenarioWithGroq({
      apiKey: "test-key",
      requirement,
      scenario,
      cacheKey: "invalid-json-key",
      fetchImpl,
      retryDelayMs: 0
    });

    expect(result.source).toBe("deterministic_fallback");
    expect(result.scenario).toEqual(scenario);
  });
});
