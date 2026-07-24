# VoiceGauntlet

VoiceGauntlet is a QA and red-team lab for ElevenLabs voice agents. It reads structured requirements, generates synthetic adversarial caller scenarios, and maps evaluator results to requirement IDs. The public demo is fixture-backed; authenticated environments can run ElevenLabs simulations and live-agent WebSocket flows with explicit source labels.

## What It Does

Normal voice-agent demos emphasize the happy path. VoiceGauntlet exercises failure modes relevant to deployed agents: angry refunds, duplicate charges, prompt injection, privacy boundaries, tool outages, bilingual callers, and escalation pressure.

A run follows this sequence:

```text
Kiro spec -> 20 deterministic synthetic scenarios -> fixture demo or authenticated provider run
-> labeled result -> Forensic Replay -> shrink failure -> export Kiro task -> rerun
```

## Run and audio labels

VoiceGauntlet keeps runtime labels exact:

- **ElevenLabs simulation** means `simulate-conversation`: real agent testing with text transcript, tool calls, and analysis. It is not an audio call.
- **Live agent stream** means the authenticated browser is playing a synthetic caller locally while receiving and playing ElevenLabs Agent WebSocket audio chunks.
- **Recorded ElevenLabs call** means actual conversation audio exists and is backed by ElevenLabs conversation/audio metadata.
- **Generated replay** means two-speaker audio created from a real transcript. The live replay route uses ElevenLabs Text to Dialogue when a valid key is configured. It is hearable evidence, but not a recorded call.
- **Demo fixture** means a checked-in dataset and replay used by the public demo, not a live provider run.

The demo identifies fixture-backed runs and generated audio directly. Provider errors remain errors rather than being presented as successful runs.

## Specification workflow

The root `.kiro` directory contains the requirements, test scenarios, implementation tasks, and workflow hooks used by the evaluation system:

- `.kiro/specs/voicegauntlet`: product requirements, design, and implementation tasks.
- `.kiro/specs/refundbot-demo`: demo agent requirements that generate adversarial scenarios.
- `.kiro/specs/agent-hardening`: exported fix tasks from failed runs.
- `.kiro/steering`: product, tech, safety, UI, demo, and ElevenLabs API guidance.
- `.kiro/hooks`: spec-save scenario regeneration, agent-config smoke tests, security scan, and public-demo verification.
- `.kiro/settings/mcp.json`: local MCP server configuration for Kiro.
- **ElevenLabs Kiro Power**: API guidance for simulation, Text to Dialogue, Agent WebSockets, and conversation audio behavior.

## Local MCP Setup

The MCP package is private to this repo, so the README does not point to an unpublished `npx @voicegauntlet/mcp` package. Use the local workspace server instead:

```bash
pnpm install
pnpm --silent mcp
```

Kiro can use the checked-in `.kiro/settings/mcp.json`, which runs:

```bash
pnpm --silent mcp
```

Available MCP tools:

- `voicegauntlet.generate_suite_from_spec`
- `voicegauntlet.run_smoke_suite`
- `voicegauntlet.shrink_failure`
- `voicegauntlet.export_fix_tasks`
- `voicegauntlet.get_run`

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/demo` for the fixture-backed public demo and `http://localhost:3000/app` for authenticated live runs. The live workspace accepts an ElevenLabs agent ID, imports Kiro requirements, starts Live Monitor audio, runs `simulate-conversation`, generates forensic replay audio, checks recorded-call metadata after WebSocket close, persists evidence to Supabase, exports Kiro tasks, and reruns the selected live scenario.

## Environment

Required for live provider-backed runs:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

The ElevenLabs key must include the permissions needed for workspace/user checks, voices/TTS, Text to Dialogue, and Conversational AI agent reads/runs. At minimum the live agent flow needs `convai_read` plus generation permissions.

Groq is used carefully because free-tier limits can rate-limit. Scenario refinement must cache by spec hash, run with concurrency `1`, retry `429` once when retry metadata is available, and fall back to deterministic templates.

OpenAI is an optional legacy fallback and is not required by the primary demo flow.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm check:public-copy
pnpm agent:ensure
pnpm demo:audio
pnpm smoke:elevenlabs
pnpm smoke:elevenlabs:ws
pnpm security:scan
pnpm --silent mcp
```

`pnpm agent:ensure` creates or reuses a real ElevenLabs agent named `VoiceGauntlet RefundBot` and writes its agent ID to `apps/web/.env.local`. `pnpm demo:audio` regenerates the public demo replay with ElevenLabs Text to Dialogue and writes a provider metadata manifest next to the MP3. `pnpm smoke:elevenlabs:ws` checks signed URL creation, a live WebSocket session, agent response audio chunks, and conversation metadata fetch.

## Historical deployment evidence (2026-04-22)

Previously verified deployment URL: [https://kiro-x-elevent.vercel.app](https://kiro-x-elevent.vercel.app)

The following evidence was recorded on 2026-04-22 IST in commit `d766552a4d1cb76e919856d54912073f13f0c068`. It is a historical deployment snapshot, not evidence about the currently deployed commit or current provider behavior.

- `/api/health` reported ElevenLabs, Groq, and Supabase configured.
- Public `/demo` passed desktop and mobile Playwright checks, including generated audio playback metadata.
- Public demo audio served as `audio/mpeg` and returned nonzero bytes.
- An authenticated deployment API check passed with a temporary Supabase user: signed URL creation, synthetic caller PCM, ElevenLabs WebSocket agent audio chunks, live simulation, Supabase run persistence, generated replay audio, and persisted Kiro task export.
- Local provider smokes passed: `pnpm smoke:elevenlabs` and `pnpm smoke:elevenlabs:ws`.
- Local gates passed: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm security:scan`, and `CI=1 pnpm --filter @voicegauntlet/web test:e2e`.

## Fresh anonymous deployment check (2026-07-24)

On 2026-07-24 IST, anonymous GET requests with no cookies, authorization headers, or provider credentials observed:

- `/` redirected to `/demo`, whose final response was HTTP 200 HTML.
- `/demo` returned HTTP 200 HTML.
- `/app` returned HTTP 200 and rendered the `VoiceGauntlet Live` sign-in boundary. This checks only the anonymous blocked state, not an authenticated live workflow.
- `/api/health` returned HTTP 200 JSON and self-reported ElevenLabs, Groq, and Supabase as configured. No provider operation was exercised.
- `/demo-audio/refundbot-generated-replay.mp3` returned HTTP 200 as `audio/mpeg` with 481,115 bytes. It remains labeled generated replay from a demo fixture, not a recorded call.

This fresh check establishes route and fixture reachability only. It does not establish production readiness, deployed commit identity, authenticated behavior, provider functionality, persistence, or security posture. No deployment or remote mutation was performed for this check.

## Demo walkthrough

1. Show `.kiro/specs/refundbot-demo/requirements.md`.
2. Show the 20-scenario coverage map.
3. In `/app`, start Live Monitor and let the viewer hear synthetic caller audio plus ElevenLabs agent audio chunks.
4. Run the gauntlet and show a failed evaluator result.
5. Open Forensic Replay and show whether it is a recorded call or generated replay.
6. Show the minimized failing transcript and shrink confidence.
7. Export `.kiro/specs/agent-hardening/tasks.md`.
8. Rerun the public fixture and show that its evaluator checks passed.

## Demo behavior

- Public demo works without login.
- Live mode works with configured provider keys.
- At least one failed run has hearable two-sided evidence.
- Authenticated `/app` Live Monitor plays synthetic caller audio and ElevenLabs agent stream audio.
- Audio labels are truthful: simulation, recorded call, generated replay, or demo fixture.
- Generated replay is never called a recorded call.
- Green rerun actually passes the evaluator.
- No secrets are committed, logged, screenshotted, or bundled into browser code.

## License

MIT
