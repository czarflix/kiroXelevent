---
inclusion: manual
---

# Demo Steering

The demo must be understandable in 90 seconds.

Sequence:

1. Hook: "I built 20 angry AI customers that attack your ElevenLabs voice agent before real users do."
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

20 angry AI customers attack your ElevenLabs voice agent before real users do.

It reads your Kiro spec, generates adversarial calls, runs ElevenLabs tests, plays audio evidence, shrinks failures, and exports Kiro fix tasks.

@kirodotdev @elevenlabsio
```
