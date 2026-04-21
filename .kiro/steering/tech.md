---
inclusion: always
---

# Technology Steering

Use TypeScript across the repo. Keep reusable logic in `packages/core`, UI in `apps/web`, MCP tools in `packages/mcp`, and database changes in `supabase/migrations`.

Server-only secrets must stay in route handlers, scripts, or server utilities. Do not expose ElevenLabs, OpenAI, Supabase service-role, or database URLs to browser code.

Default model choices:

- OpenAI scenario refinement: `gpt-5.4-nano`
- Escalate quality-sensitive refinement only to `gpt-5.4-mini`
- ElevenLabs simulation: `simulate-conversation` first; streaming simulation for richer operator UX
