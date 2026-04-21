# Requirements Document

## Introduction

VoiceGauntlet is a Kiro-built QA and red-team lab for ElevenLabs voice agents. It imports Kiro requirements, generates adversarial customer scenarios, runs ElevenLabs simulations, maps results back to requirement IDs, produces truthful audio evidence, shrinks failures, and exports Kiro fix tasks.

## Requirements

### Requirement 1: Kiro Spec Import

**User Story:** As an agent builder, I want VoiceGauntlet to read my Kiro requirements file, so that voice-agent tests are traceable to the product spec.

#### Acceptance Criteria

1. WHEN a user imports `.kiro/specs/**/requirements.md`, THE SYSTEM SHALL parse requirement IDs, user stories, and acceptance criteria
2. WHEN acceptance criteria use EARS notation, THE SYSTEM SHALL preserve trigger, actor, and SHALL clauses
3. WHEN a requirement cannot be parsed, THE SYSTEM SHALL report a lint issue without blocking other requirements

### Requirement 2: Adversarial Scenario Generation

**User Story:** As a QA lead, I want adversarial callers generated from each requirement, so that weak voice-agent behavior is exposed before production.

#### Acceptance Criteria

1. WHEN requirements are parsed for normal live execution, THE SYSTEM SHALL generate one to three compact adversarial scenarios per requirement
2. WHEN the public proof flow is shown, THE SYSTEM SHALL expose a 20-scenario coverage suite for the hook claim
3. WHEN generating scenarios, THE SYSTEM SHALL include anger, prompt injection, tool failure, bilingual, privacy, ambiguity, chargeback, conversation repair, and escalation variants where relevant
4. WHEN scenarios are generated, THE SYSTEM SHALL preserve the requirement ID on every scenario

### Requirement 3: ElevenLabs Simulation

**User Story:** As a voice-agent engineer, I want each scenario to run against an ElevenLabs agent, so that failures are based on real agent behavior.

#### Acceptance Criteria

1. WHEN an ElevenLabs agent ID and API key are configured, THE SYSTEM SHALL run `simulate-conversation` for selected scenarios
2. WHEN simulation results return, THE SYSTEM SHALL persist transcript turns, criteria results, tool calls, score, mapped requirement ID, and source label `ElevenLabs simulation`
3. WHEN simulation results are displayed, THE SYSTEM SHALL not imply that `simulate-conversation` produced recorded audio
4. WHEN ElevenLabs is unavailable, THE SYSTEM SHALL show a recoverable error and preserve the seeded demo without disguising provider failure as live success

### Requirement 4: Audio Evidence

**User Story:** As a reviewer, I want to hear the worst failure, so that the problem is obvious in the demo.

#### Acceptance Criteria

1. WHEN a run fails, THE SYSTEM SHALL provide transcript replay for the failed conversation
2. WHEN recorded ElevenLabs conversation audio exists, THE SYSTEM SHALL label it `Recorded ElevenLabs call`
3. WHEN recorded conversation audio does not exist, THE SYSTEM SHALL synthesize two-speaker replay audio from the real transcript and label it `Generated replay`
4. WHEN no audio exists, THE SYSTEM SHALL show an explicit unavailable state instead of a fake waveform

### Requirement 8: Live Monitor

**User Story:** As a reviewer, I want to hear an adversarial customer and the ElevenLabs agent while the WebSocket conversation is happening, so that the product demo feels like a real voice-agent test lab.

#### Acceptance Criteria

1. WHEN an authenticated user starts Live Monitor, THE SYSTEM SHALL fetch a server-generated signed ElevenLabs WebSocket URL without exposing the API key
2. WHEN Live Monitor starts, THE SYSTEM SHALL generate synthetic caller PCM audio with ElevenLabs TTS, play it locally, and send the same PCM chunks to the Agent WebSocket
3. WHEN the ElevenLabs WebSocket emits agent audio chunks, THE SYSTEM SHALL play those chunks through the browser after the user's click
4. WHEN WebSocket transcript events arrive, THE SYSTEM SHALL show live customer and agent transcript rows
5. WHEN the WebSocket closes, THE SYSTEM SHALL check conversation metadata/audio and label recorded-call evidence only when both user and response audio are confirmed

### Requirement 5: Failure Shrinking

**User Story:** As a developer, I want the smallest reproducible failing transcript, so that I can fix the root cause quickly.

#### Acceptance Criteria

1. WHEN a failure is selected, THE SYSTEM SHALL attempt to remove turns while preserving the failure predicate
2. WHEN turn-level shrinking is complete, THE SYSTEM SHALL attempt sentence-level shrinking
3. WHEN shrinking finishes, THE SYSTEM SHALL show original size, minimized size, confidence, and reproduction command

### Requirement 6: Kiro Fix Export

**User Story:** As a Kiro user, I want VoiceGauntlet to export fix tasks, so that hardening work can continue inside a spec-driven workflow.

#### Acceptance Criteria

1. WHEN failures exist, THE SYSTEM SHALL generate Kiro-style hardening tasks in Markdown
2. WHEN tasks are generated, THE SYSTEM SHALL include requirement ID, scenario, severity, evidence, and acceptance condition
3. WHEN all runs pass, THE SYSTEM SHALL generate a green certification result

### Requirement 7: LLM Refinement With Fallback

**User Story:** As a builder using free-tier LLM credits, I want scenario refinement to survive rate limits, so that the demo is not blocked by a provider outage.

#### Acceptance Criteria

1. WHEN Groq is configured, THE SYSTEM SHALL use it only from server-side code for low-frequency scenario refinement or evaluator rationale
2. WHEN Groq rate-limits or fails, THE SYSTEM SHALL fall back to deterministic templates and label the fallback honestly
3. WHEN scenario prompts are repeated, THE SYSTEM SHALL reuse cached results by spec or prompt hash where available
