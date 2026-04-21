import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  userStory: z.string().optional(),
  acceptance: z.array(z.string()),
  ears: z.array(
    z.object({
      id: z.string(),
      raw: z.string(),
      trigger: z.string(),
      actor: z.string(),
      shall: z.string()
    })
  ),
  sourcePath: z.string(),
  sourceLine: z.number()
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  title: z.string(),
  persona: z.string(),
  goal: z.string(),
  prompt: z.string(),
  expectedBehavior: z.string(),
  tags: z.array(z.string()),
  severity: SeveritySchema,
  seed: z.number()
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const TranscriptTurnSchema = z.object({
  index: z.number(),
  role: z.enum(["user", "agent", "system", "tool"]),
  message: z.string(),
  timeInCallSecs: z.number().optional(),
  toolCalls: z.array(z.record(z.string(), z.unknown())).optional(),
  toolResults: z.array(z.record(z.string(), z.unknown())).optional()
});
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>;

export const RunSourceSchema = z.enum(["demo_fixture", "elevenlabs_simulation", "audio_probe"]);
export type RunSource = z.infer<typeof RunSourceSchema>;

export const AudioEvidenceSourceSchema = z.enum(["none", "recorded_call", "generated_replay", "turn_player"]);
export type AudioEvidenceSource = z.infer<typeof AudioEvidenceSourceSchema>;

export const AudioEvidenceSchema = z.object({
  source: AudioEvidenceSourceSchema,
  label: z.string(),
  url: z.string().nullable(),
  turnAudio: z.array(
    z.object({
      role: z.enum(["user", "agent"]),
      url: z.string(),
      label: z.string(),
      durationSecs: z.number().optional()
    })
  ),
  conversationId: z.string().nullable(),
  hasUserAudio: z.boolean().nullable(),
  hasResponseAudio: z.boolean().nullable(),
  generatedAt: z.string().nullable(),
  warning: z.string().nullable()
});
export type AudioEvidence = z.infer<typeof AudioEvidenceSchema>;

export const RunResultSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  requirementId: z.string(),
  status: z.enum(["passed", "failed", "error", "running"]),
  severity: SeveritySchema,
  score: z.number().min(0).max(1),
  summary: z.string(),
  transcript: z.array(TranscriptTurnSchema),
  criteria: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      passed: z.boolean(),
      rationale: z.string()
    })
  ),
  runSource: RunSourceSchema,
  audioEvidence: AudioEvidenceSchema,
  audioUrl: z.string().nullable(),
  providerRaw: z.unknown().optional(),
  warnings: z.array(z.string()),
  createdAt: z.string()
});
export type RunResult = z.infer<typeof RunResultSchema>;

export const FailureSchema = z.object({
  id: z.string(),
  runId: z.string(),
  scenarioId: z.string(),
  requirementId: z.string(),
  severity: SeveritySchema,
  title: z.string(),
  evidence: z.string(),
  minimalTranscript: z.array(TranscriptTurnSchema),
  originalTurnCount: z.number(),
  minimizedTurnCount: z.number(),
  confidence: z.number().min(0).max(1),
  reproductionCommand: z.string()
});
export type Failure = z.infer<typeof FailureSchema>;
