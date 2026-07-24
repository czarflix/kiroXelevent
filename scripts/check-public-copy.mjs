import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const publicCopyFiles = [
  "README.md",
  "LIMITATIONS.md",
  "ARCHITECTURE.md",
  "supabase/seed/README.md",
  "packages/core/src/demo-data.ts",
  "apps/web/components/auth-gate.tsx",
  "apps/web/components/gauntlet-console.tsx",
  "apps/web/e2e/demo.spec.ts",
  ".kiro/steering/demo.md",
  ".kiro/specs/agent-hardening/requirements.md",
  ".kiro/specs/voicegauntlet/requirements.md"
];

const disallowedCopy = [
  /\bcertif\w*\b/i,
  /\bjudges?\b/i,
  /\brecruiter-facing\b/i,
  /\binterview-safe\b/i,
  /\bportfolio framing\b/i,
  /\bevidence boundar(?:y|ies)\b/i,
  /\bpositioning copy\b/i,
  /\bproof packet\b/i,
  /\brepair branch\b/i,
  /\bhackathon\b/i,
  /\bElevenHacks\b/i,
  /\bsubmission (?:pack|checklist|surface)\b/i,
  /\bowned the problem definition\b/i
];
const failures = [];

for (const file of publicCopyFiles) {
  const copy = read(file);
  for (const pattern of disallowedCopy) {
    const match = copy.match(pattern);
    if (match) {
      failures.push(`${file}: public copy contains ${JSON.stringify(match[0])}`);
    }
  }
}

function requireText(file, expected) {
  try {
    assert.ok(read(file).includes(expected), `${file}: missing ${JSON.stringify(expected)}`);
  } catch (error) {
    failures.push(error.message);
  }
}

requireText("apps/web/components/gauntlet-console.tsx", "Public fixture rerun passed evaluator checks.");
requireText("apps/web/components/gauntlet-console.tsx", "The selected live simulation passed the current VoiceGauntlet evaluator criteria.");
requireText("README.md", "## Historical deployment evidence (2026-04-22)");
requireText("README.md", "## Fresh anonymous deployment check (2026-07-24)");
requireText("README.md", "does not establish production readiness");

for (const label of [
  "synthetic caller",
  "Live agent stream",
  "Recorded ElevenLabs call",
  "Generated replay",
  "Demo fixture"
]) {
  requireText("README.md", label);
}

requireText("packages/core/src/types.ts", 'z.enum(["demo_fixture", "elevenlabs_simulation", "audio_probe"])');
requireText("packages/core/src/types.ts", 'z.enum(["none", "recorded_call", "generated_replay", "turn_player"])');

if (failures.length > 0) {
  throw new Error(`Public-copy consistency check failed:\n- ${failures.join("\n- ")}`);
}

console.log("Public copy and source labels are consistent.");
