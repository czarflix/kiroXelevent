# Evaluation methodology

The evaluator maps a run to requirement IDs and records pass, fail, skipped, and unavailable states. A valid evaluation must preserve the scenario, provider mode, transcript, tool calls, evidence level, and failure reason.

## Required test classes

- Refund and duplicate-charge pressure.
- Prompt injection in caller content.
- PII disclosure request.
- Tool timeout, malformed tool result, and provider rate limit.
- Escalation boundary and unsupported policy request.
- Bilingual or ambiguous caller input.
- Missing or conflicting requirement text.
- Replay/shrinker preserving the original failing assertion.

## Interpreting results

The public repository can demonstrate fixture behavior and local unit tests. It does not claim a measured pass rate for live production agents unless the exact run artifact is checked in with its evidence level and reproducible evaluator input.
