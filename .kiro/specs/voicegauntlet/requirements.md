# Requirements Document

## Introduction

VoiceGauntlet is a QA and red-team lab for ElevenLabs voice agents. It imports Kiro requirements, generates adversarial customer scenarios, runs ElevenLabs simulations, maps results back to requirement IDs, replays failures, shrinks failures, and exports Kiro fix tasks.

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

1. WHEN requirements are parsed, THE SYSTEM SHALL generate one to three adversarial scenarios per requirement
2. WHEN generating scenarios, THE SYSTEM SHALL include anger, prompt injection, tool failure, bilingual, privacy, and escalation variants where relevant
3. WHEN scenarios are generated, THE SYSTEM SHALL preserve the requirement ID on every scenario

### Requirement 3: ElevenLabs Simulation

**User Story:** As a voice-agent engineer, I want each scenario to run against an ElevenLabs agent, so that failures are based on real agent behavior.

#### Acceptance Criteria

1. WHEN an ElevenLabs agent ID and API key are configured, THE SYSTEM SHALL run `simulate-conversation` for selected scenarios
2. WHEN simulation results return, THE SYSTEM SHALL persist transcript turns, criteria results, tool calls, score, and mapped requirement ID
3. WHEN ElevenLabs is unavailable, THE SYSTEM SHALL show a recoverable error and preserve the seeded demo

### Requirement 4: Failure Replay

**User Story:** As a reviewer, I want to hear the worst failure, so that the problem is obvious in the demo.

#### Acceptance Criteria

1. WHEN a run fails, THE SYSTEM SHALL provide transcript replay for the failed conversation
2. WHEN conversation audio is available, THE SYSTEM SHALL use stored ElevenLabs audio
3. WHEN conversation audio is unavailable, THE SYSTEM SHALL synthesize replay audio from transcript text

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
