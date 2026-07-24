---
inclusion: manual
---

# Demo walkthrough

The demo must be understandable in 90 seconds.

Sequence:

1. Show `.kiro/specs/refundbot-demo/requirements.md`.
2. Run the gauntlet and show its source label.
3. In `/app`, start Live Monitor and let the viewer hear the synthetic caller and ElevenLabs agent stream.
4. Open a failed result mapped to a requirement ID.
5. Play Forensic Replay and label it exactly: recorded call or generated replay.
6. Shrink to the minimal failing transcript and show confidence.
7. Export `.kiro/specs/agent-hardening/tasks.md`.
8. Rerun the public fixture and show that its evaluator checks passed.

Do not record any clip that implies `simulate-conversation` produced call audio. Simulation is transcript and analysis. Live Monitor audio is transient WebSocket playback. Forensic Replay must use recorded conversation audio or a clearly labeled generated replay from the real transcript.
