---
inclusion: always
---

# Technology Steering

Use TypeScript across the repo. Keep reusable logic in `packages/core`, UI in `apps/web`, MCP tools in `packages/mcp`, and database changes in `supabase/migrations`.

Server-only secrets must stay in route handlers, scripts, or server utilities. Do not expose ElevenLabs, Groq, OpenAI, Supabase service-role, or database URLs to browser code.

Default model choices:

- Groq scenario refinement: `openai/gpt-oss-120b`
- Groq concurrency: 1 request at a time, cache by spec or prompt hash, retry rate limits once, then deterministic fallback
- OpenAI: optional legacy fallback only; do not depend on it for the final demo
- ElevenLabs simulation: `simulate-conversation` for bulk text QA
- ElevenLabs audio: Agent WebSocket or conversation audio for recorded calls; Text to Dialogue or TTS for clearly labeled generated replay
