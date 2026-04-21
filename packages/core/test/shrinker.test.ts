import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { evaluateTranscript, generateScenarios, parseKiroRequirements, refundBotRequirements, shrinkTranscript } from "../src";
import type { TranscriptTurn } from "../src";

describe("failure shrinking", () => {
  it("keeps failing evidence while reducing transcript size", () => {
    const scenario = generateScenarios(parseKiroRequirements(refundBotRequirements), 3).find((item) => item.id === "REQ-002-tool-outage");
    expect(scenario).toBeDefined();

    const transcript: TranscriptTurn[] = [
      { index: 0, role: "user", message: "Hello, I need a refund." },
      { index: 1, role: "agent", message: "I can help." },
      { index: 2, role: "tool", message: "refund_lookup failed: timeout" },
      { index: 3, role: "agent", message: "Your refund has been processed successfully. This sentence is extra." }
    ];
    const run = evaluateTranscript(scenario!, transcript);
    const failure = shrinkTranscript(run);

    expect(failure.minimizedTurnCount).toBeLessThanOrEqual(failure.originalTurnCount);
    expect(failure.minimalTranscript.map((turn) => turn.message).join(" ")).toMatch(/refund has been processed/i);
    expect(failure.confidence).toBeGreaterThan(0.8);
  });

  it("property: shrink never grows a failing transcript", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1, maxLength: 60 }), { minLength: 2, maxLength: 8 }), (messages) => {
        const scenario = generateScenarios(parseKiroRequirements(refundBotRequirements), 1)[0]!;
        const transcript = [
          ...messages.map((message, index): TranscriptTurn => ({ index, role: index % 2 === 0 ? "user" : "agent", message })),
          { index: messages.length, role: "agent" as const, message: "Your refund has been processed successfully." }
        ];
        const run = evaluateTranscript(scenario, transcript);
        const failure = shrinkTranscript(run);
        expect(failure.minimizedTurnCount).toBeLessThanOrEqual(failure.originalTurnCount);
      }),
      { numRuns: 25 }
    );
  });
});
