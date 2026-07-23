# Threat model

## Assets

- Agent requirements and hidden evaluation expectations.
- Transcripts, tool traces, audio, and exported hardening tasks.
- Provider credentials and authenticated browser/session state.
- Supabase persistence and user ownership boundaries.

## Threats

| Threat | Control / evidence | Remaining limitation |
|---|---|---|
| Prompt injection from caller or retrieved requirement | Requirement-aware evaluator and explicit trace labels | Coverage depends on the checked-in case set |
| PII in transcripts or audio | Synthetic public fixtures and server-side provider access | Private deployments still need retention and deletion controls |
| Provider/tool failure disguised as success | Truth model distinguishes simulation, replay, recording, and live integration | Operators must inspect provider metadata for live claims |
| Cross-user trace access | Authenticated route helpers and persistence boundaries | Deployment RLS and authorization require environment verification |
| Secret leakage in logs or artifacts | `.env.example` documents names only; local security scan scripts exist | Existing deployment logs must be reviewed separately |

## Safety boundary

VoiceGauntlet is an evaluation harness. It should not place calls, send messages, or alter an external agent without explicit operator control in a private environment.
