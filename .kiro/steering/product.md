---
inclusion: always
---

# Product Steering

VoiceGauntlet tests ElevenLabs voice agents against adversarial customer scenarios. Prioritize traceability, explicit source labels, and clear results over generic analytics.

Every feature should answer one of these questions:

- Which requirement did this validate?
- What exact caller broke the agent?
- What did the agent say or do wrong?
- What is the smallest reproducible failure?
- What Kiro task fixes it?

Runtime source labels must be exact. A simulation transcript is not a recorded call. A generated replay is useful evidence, but it must be labeled as generated replay. Recorded-call wording is reserved for actual ElevenLabs conversation audio.
