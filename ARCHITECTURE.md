# VoiceGauntlet architecture

VoiceGauntlet is a QA and red-team lab for voice-agent requirements. Its public demo is deliberately fixture-backed; provider-backed runs require private credentials and an authenticated environment.

```mermaid
flowchart LR
    SPEC[Kiro requirements] --> GEN[Scenario generator]
    GEN --> CASES[Adversarial cases]
    CASES --> SIM[Provider simulation or live run]
    SIM --> TRACE[Transcript, tool, and status trace]
    TRACE --> EVAL[Requirement evaluator]
    EVAL --> SHRINK[Failure shrinker]
    SHRINK --> TASK[Hardening task export]
    TRACE --> UI[Replay and evidence UI]
```

## Evidence levels

- **Synthetic scenario:** generated input with no provider execution.
- **Fixture:** checked-in deterministic data used by the public demo.
- **Generated replay:** audio or transcript generated from a known trace.
- **Recorded interaction:** provider metadata and audio identify a real interaction.
- **Live integration:** authenticated provider call with runtime metadata.

The UI and exported traces must preserve this distinction. A fixture or generated replay is not a production incident.

## Privacy boundary

Provider credentials remain server-side. Public fixtures must contain synthetic identities and sanitized transcripts. Do not commit cookies, session profiles, customer recordings, or provider access tokens.
