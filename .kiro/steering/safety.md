---
inclusion: always
---

# Safety Steering

Never commit secrets. Use `.env.example` placeholders only.

VoiceGauntlet is a testing tool. It may generate adversarial prompts, but it must keep them scoped to QA for the user's own agents. Do not provide instructions for fraud, credential theft, harassment, or real-world abuse.

Red-team scenarios should test refusal, privacy, tool failure, and escalation behavior without encouraging illegal activity.

Do not misrepresent generated artifacts. The app and demo must distinguish text simulation, recorded call audio, generated replay audio, and demo fixtures.
