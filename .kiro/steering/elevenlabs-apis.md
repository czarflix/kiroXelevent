---
inclusion: auto
name: elevenlabs-apis
description: Use when modifying ElevenLabs simulation, agent testing, Agent WebSocket, TTS, Text to Dialogue, or conversation replay code.
---

# ElevenLabs API Steering

Use the ElevenLabs Kiro Power as the Kiro-side API guidance source when refining simulation, Text to Dialogue, Agent WebSocket, and conversation audio behavior.

Use server-side `xi-api-key` only.

Primary endpoints:

- `POST /v1/convai/agents/:agent_id/simulate-conversation`
- `POST /v1/convai/agents/:agent_id/simulate-conversation/stream`
- Agent WebSocket signed URL and WebSocket conversation stream
- `POST /v1/convai/agent-testing/create`
- `POST /v1/convai/agents/:agent_id/run-tests`
- `GET /v1/convai/conversations/:conversation_id`
- `GET /v1/convai/conversations/:conversation_id/audio`
- `POST /v1/text-to-dialogue`
- `POST /v1/text-to-speech/:voice_id`

Treat `simulate-conversation` as text-first. It returns transcript, tool calls, and analysis; it does not create recorded call audio.

Audio evidence rules:

- Use `Recorded ElevenLabs call` only when conversation metadata/audio proves audio exists.
- Use `Generated replay` for Text to Dialogue or TTS audio created from a real transcript.
- If no audio exists, show an explicit unavailable state instead of a waveform.
- Never silently convert provider failure into a successful live run.
