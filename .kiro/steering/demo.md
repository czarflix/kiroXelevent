---
inclusion: manual
---

# Demo Steering

The demo must be understandable in 90 seconds.

Sequence:

1. Hook: "I built 20 angry AI customers that attack your ElevenLabs voice agent before real users do."
2. Show `.kiro/specs/refundbot-demo/requirements.md`.
3. Run the gauntlet and show source provenance.
4. Open a red failure mapped to a requirement ID.
5. Play hearable evidence and label it exactly: recorded call or generated replay.
6. Shrink to the minimal failing transcript.
7. Export `.kiro/specs/agent-hardening/tasks.md`.
8. Rerun green and show certification.

Do not record any clip that implies `simulate-conversation` produced call audio. Simulation is transcript and analysis. Audio proof must be recorded conversation audio or a clearly labeled generated replay from the real transcript.

Social caption:

```text
I built VoiceGauntlet for #ElevenHacks #CodeWithKiro.

20 angry AI customers attack your ElevenLabs voice agent before real users do.

It reads your Kiro spec, generates adversarial calls, runs ElevenLabs tests, plays audio evidence, shrinks failures, and exports Kiro fix tasks.

@kirodotdev @elevenlabsio
```
