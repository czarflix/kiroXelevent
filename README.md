# VoiceGauntlet

VoiceGauntlet is a Kiro-ready QA and red-team lab for ElevenLabs voice agents. It reads Kiro specs, generates adversarial customer scenarios, runs simulations, maps failures to requirement IDs, replays failures as audio, shrinks failing transcripts, and exports Kiro hardening tasks.

[![Add to Kiro](https://kiro.dev/images/add-to-kiro.svg)](https://kiro.dev/launch/mcp/add?name=voicegauntlet&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40voicegauntlet%2Fmcp%22%5D%2C%22env%22%3A%7B%22VOICEGAUNTLET_SITE_URL%22%3A%22%24%7BVOICEGAUNTLET_SITE_URL%7D%22%2C%22VOICEGAUNTLET_API_KEY%22%3A%22%24%7BVOICEGAUNTLET_API_KEY%7D%22%7D%2C%22disabled%22%3Afalse%2C%22autoApprove%22%3A%5B%5D%7D)

## Why It Exists

Normal voice-agent demos prove the happy path. VoiceGauntlet attacks the unhappy paths before real customers do: angry refunds, duplicate charges, prompt injection, privacy boundaries, tool outages, bilingual calls, and escalation pressure.

## Kiro Usage

The repository includes a root `.kiro` directory with:

- specs: `voicegauntlet`, `refundbot-demo`, and `agent-hardening`
- steering: product, tech, structure, safety, demo, ElevenLabs API, and UI guidance
- hooks: scenario regeneration, smoke-suite runs, security scanning, and submission-pack generation
- MCP settings for the local VoiceGauntlet MCP server

The project was authored with Codex and structured to match Kiro's published conventions. A small real Kiro validation pass should be recorded before final submission if credits are available.

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/demo` for the public judge demo.

## Environment

Required for real runs:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

The demo route works with seeded data even before live API keys are configured.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:elevenlabs
pnpm smoke:openai
pnpm security:scan
```

## Submission Script

Hook: “I built 20 angry AI customers that attack your ElevenLabs voice agent before real users do.”

Show: Kiro spec import, gauntlet generation, red failure, audio replay, minimized failing transcript, exported Kiro tasks, rerun green, and the VoiceGauntlet Certified badge.

## License

MIT
