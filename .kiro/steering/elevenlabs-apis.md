---
inclusion: auto
name: elevenlabs-apis
description: Use when modifying ElevenLabs simulation, agent testing, TTS, or conversation replay code.
---

# ElevenLabs API Steering

Use server-side `xi-api-key` only.

Primary endpoints:

- `POST /v1/convai/agents/:agent_id/simulate-conversation`
- `POST /v1/convai/agents/:agent_id/simulate-conversation/stream`
- `POST /v1/convai/agent-testing/create`
- `POST /v1/convai/agents/:agent_id/run-tests`
- `GET /v1/convai/conversations/:conversation_id`
- `GET /v1/convai/conversations/:conversation_id/audio`
- `POST /v1/text-to-speech/:voice_id`

Treat simulation as text-first. Audio replay should use stored conversation audio when available, then TTS fallback.
