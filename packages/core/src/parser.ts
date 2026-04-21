import type { Requirement } from "./types";

const requirementHeading = /^#{2,3}\s+Requirement\s+(\d+)\s*:?\s*(.*)$/i;
const acceptanceHeading = /^#{3,5}\s+Acceptance Criteria/i;
const userStoryLine = /^\*\*User Story:\*\*\s*(.*)$/i;
const numberedAcceptance = /^\s*\d+\.\s+(.*)$/;
const earsPattern = /\bWHEN\s+(.+?),?\s+THE\s+(.+?)\s+SHALL\s+(.+)$/i;

export function parseKiroRequirements(markdown: string, sourcePath = ".kiro/specs/voicegauntlet/requirements.md"): Requirement[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const requirements: Requirement[] = [];
  let current: Requirement | null = null;
  let inAcceptance = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const heading = line.match(requirementHeading);

    if (heading) {
      if (current) {
        requirements.push(current);
      }

      current = {
        id: `REQ-${heading[1]?.padStart(3, "0")}`,
        title: heading[2]?.trim() || `Requirement ${heading[1]}`,
        acceptance: [],
        ears: [],
        sourcePath,
        sourceLine: i + 1
      };
      inAcceptance = false;
      continue;
    }

    if (!current) {
      continue;
    }

    const story = line.match(userStoryLine);
    if (story) {
      current.userStory = story[1]?.trim();
      continue;
    }

    if (acceptanceHeading.test(line)) {
      inAcceptance = true;
      continue;
    }

    if (line.startsWith("### ") && !acceptanceHeading.test(line)) {
      inAcceptance = false;
    }

    if (!inAcceptance) {
      continue;
    }

    const acceptance = line.match(numberedAcceptance);
    if (!acceptance?.[1]) {
      continue;
    }

    const raw = acceptance[1].trim();
    current.acceptance.push(raw);
    const ears = raw.match(earsPattern);
    if (ears?.[1] && ears[2] && ears[3]) {
      current.ears.push({
        id: `${current.id}-AC-${String(current.acceptance.length).padStart(2, "0")}`,
        raw,
        trigger: ears[1].trim(),
        actor: ears[2].trim(),
        shall: ears[3].trim()
      });
    }
  }

  if (current) {
    requirements.push(current);
  }

  return requirements;
}

export function lintRequirements(requirements: Requirement[]): string[] {
  const issues: string[] = [];
  for (const requirement of requirements) {
    if (requirement.acceptance.length === 0) {
      issues.push(`${requirement.id} has no acceptance criteria.`);
    }
    if (requirement.ears.length === 0) {
      issues.push(`${requirement.id} has no EARS-formatted acceptance criteria.`);
    }
    if (!requirement.userStory) {
      issues.push(`${requirement.id} has no user story.`);
    }
  }
  return issues;
}
