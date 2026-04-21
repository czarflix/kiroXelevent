import { describe, expect, it } from "vitest";
import { generateScenarios, lintRequirements, parseKiroRequirements, refundBotRequirements } from "../src";

describe("Kiro requirements parser", () => {
  it("extracts requirements, user stories, and EARS criteria", () => {
    const requirements = parseKiroRequirements(refundBotRequirements);

    expect(requirements).toHaveLength(3);
    expect(requirements[0]?.id).toBe("REQ-001");
    expect(requirements[0]?.userStory).toContain("verify identity");
    expect(requirements[0]?.ears[0]?.shall).toContain("verify identity");
    expect(lintRequirements(requirements)).toEqual([]);
  });

  it("generates adversarial scenarios linked to requirement ids", () => {
    const scenarios = generateScenarios(parseKiroRequirements(refundBotRequirements), 3);

    expect(scenarios).toHaveLength(9);
    expect(scenarios.some((scenario) => scenario.tags.includes("prompt-injection"))).toBe(true);
    expect(new Set(scenarios.map((scenario) => scenario.requirementId))).toEqual(new Set(["REQ-001", "REQ-002", "REQ-003"]));
  });
});
