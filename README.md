# VoiceGauntlet

VoiceGauntlet is a **Kiro-built** QA and red-team lab for ElevenLabs voice agents. It reads Kiro specs, generates adversarial customer scenarios, runs real ElevenLabs agent tests, maps failures to requirement IDs, produces hearable evidence, shrinks failures, and exports Kiro hardening tasks.

> Hook: "I built 20 angry AI customers that attack your ElevenLabs voice agent and break it before real users do."

## What It Does

Normal voice-agent demos prove the happy path. VoiceGauntlet attacks the paths that break production agents: angry refunds, duplicate charges, prompt injection, privacy boundaries, tool outages, bilingual callers, and escalation pressure.

The final product loop is:

```text
Kiro spec -> adversarial scenarios -> ElevenLabs simulation -> red failure
-> hear audio evidence -> shrink failure -> export Kiro task -> rerun green
```

## Truth Model

VoiceGauntlet keeps runtime labels exact:

- **ElevenLabs simulation** means `simulate-conversation`: real agent testing with text transcript, tool calls, and analysis. It is not an audio call.
- **Recorded ElevenLabs call** means actual conversation audio exists and is backed by ElevenLabs conversation/audio metadata.
- **Generated replay** means two-speaker audio created from a real transcript. The live replay route uses ElevenLabs Text to Dialogue when a valid key is configured. It is hearable evidence, but not a recorded call.
- **Demo fixture** means a preverified public proof artifact for judges, not a live provider run.

No fake run buttons, no fake waveform, and no provider failure disguised as success belong in the final submission surface.

## Kiro Usage

This repo is built with Kiro for ElevenHacks Hack #5. The root `.kiro` directory is part of the product, not decoration:

- `.kiro/specs/voicegauntlet`: product requirements, design, and implementation tasks.
- `.kiro/specs/refundbot-demo`: demo agent requirements that generate adversarial scenarios.
- `.kiro/specs/agent-hardening`: exported fix tasks from failed runs.
- `.kiro/steering`: product, tech, safety, UI, demo, and ElevenLabs API guidance.
- `.kiro/hooks`: spec-save scenario regeneration, agent-config smoke tests, security scan, and submission pack generation.
- `.kiro/settings/mcp.json`: local MCP server configuration for Kiro.
- **ElevenLabs Kiro Power**: used as the Kiro-side API guidance layer for simulation, Text to Dialogue, Agent WebSockets, and conversation audio behavior.

## Local MCP Setup

The MCP package is private to this repo, so the README does not point to an unpublished `npx @voicegauntlet/mcp` package. Use the local workspace server instead:

```bash
pnpm install
pnpm mcp
```

Kiro can use the checked-in `.kiro/settings/mcp.json`, which runs:

```bash
pnpm mcp
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

Open `http://localhost:3000/demo` for the public judge demo and `http://localhost:3000/app` for authenticated live runs. The live workspace accepts an ElevenLabs agent ID, imports Kiro requirements, runs `simulate-conversation`, generates replay audio, runs a WebSocket audio probe, persists evidence to Supabase, exports Kiro tasks, and reruns the selected live scenario.

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

OpenAI is optional legacy fallback only. Do not rely on it for the final demo path.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm agent:ensure
pnpm demo:audio
pnpm smoke:elevenlabs
pnpm smoke:elevenlabs:ws
pnpm security:scan
pnpm mcp
```

`pnpm agent:ensure` creates or reuses a real ElevenLabs agent named `VoiceGauntlet RefundBot` and writes its agent ID to `apps/web/.env.local`. `pnpm demo:audio` regenerates the public proof replay with ElevenLabs Text to Dialogue and writes a provider proof manifest next to the MP3. `pnpm smoke:elevenlabs:ws` proves signed URL creation, a live WebSocket session, agent response audio chunks, and conversation metadata fetch.

## Production Proof

Production URL: [https://kiro-x-elevent.vercel.app](https://kiro-x-elevent.vercel.app)

Verified on 2026-04-22 IST:

- `/api/health` reports ElevenLabs, Groq, and Supabase configured.
- Public `/demo` passes desktop and mobile Playwright checks, including generated audio playback metadata.
- Public demo audio serves as `audio/mpeg` and returns nonzero bytes.
- Authenticated `/app` API probe passes against production: real ElevenLabs simulation, Supabase run persistence, generated replay audio, WebSocket probe with conversation ID, and persisted Kiro task export.
- Local gates pass: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm security:scan`, and `CI=1 pnpm --filter @voicegauntlet/web test:e2e`.

## Demo Script

Target length: 60-90 seconds.

1. Say the hook in the first five seconds.
2. Show `.kiro/specs/refundbot-demo/requirements.md`.
3. Generate or open adversarial scenarios mapped to requirement IDs.
4. Run the gauntlet and show a red failure.
5. Play the hearable evidence and show whether it is a recorded call or generated replay.
6. Show the minimized failing transcript.
7. Export `.kiro/specs/agent-hardening/tasks.md`.
8. Rerun green and show VoiceGauntlet Certified.

## Social Caption

```text
I built VoiceGauntlet for #ElevenHacks #CodeWithKiro.

20 angry AI customers attack your ElevenLabs voice agent before real users do.

It reads your Kiro spec, generates adversarial calls, runs ElevenLabs tests, plays audio evidence, shrinks failures, and exports Kiro fix tasks.

@kirodotdev @elevenlabsio
```

Post on X, LinkedIn, Instagram, and TikTok.

## Submission Checklist

- Public repo with MIT license.
- Root `.kiro` is tracked.
- Public demo works without login.
- Live mode works with configured provider keys.
- At least one failed run has hearable two-sided evidence.
- Audio labels are truthful: simulation, recorded call, generated replay, or demo fixture.
- Generated replay is never called a recorded call.
- Green rerun actually passes the evaluator.
- No secrets are committed, logged, screenshotted, or bundled into browser code.
- Final video is public, 60-90 seconds, and shows the exact working app behavior.

## License

MIT
