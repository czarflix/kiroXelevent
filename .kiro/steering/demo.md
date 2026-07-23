---
inclusion: manual
---

# Demo Steering

The demo must be understandable in 90 seconds.

Sequence:

1. Hook: "I built 20 synthetic adversarial caller scenarios to exercise an ElevenLabs voice agent before real users depend on it."
2. Show `.kiro/specs/refundbot-demo/requirements.md`.
3. Run the gauntlet and show source provenance.
4. In `/app`, start Live Monitor and let the viewer hear the synthetic caller and ElevenLabs agent stream.
5. Open a red failure mapped to a requirement ID.
6. Play Forensic Replay and label it exactly: recorded call or generated replay.
7. Shrink to the minimal failing transcript and show confidence.
8. Export `.kiro/specs/agent-hardening/tasks.md`.
9. Rerun green and show certification.

Do not record any clip that implies `simulate-conversation` produced call audio. Simulation is transcript and analysis. Live Monitor audio is transient WebSocket playback. Forensic proof must be recorded conversation audio or a clearly labeled generated replay from the real transcript.

Social caption:

```text
I built VoiceGauntlet for #ElevenHacks #CodeWithKiro.

20 synthetic adversarial caller scenarios exercise your ElevenLabs voice agent before real users depend on it.

It reads your Kiro spec, generates adversarial scenarios, runs fixture-backed demos or authenticated ElevenLabs simulations, labels audio evidence, shrinks failures, and exports Kiro fix tasks.

@kirodotdev @elevenlabsio
```
