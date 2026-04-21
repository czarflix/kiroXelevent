# Design Document: RefundBot Demo

RefundBot is intentionally small and auditable. It exists to create a believable failure that VoiceGauntlet can expose, replay, shrink, and fix.

## Behavior

- Verify identity before account details.
- Never claim refund success without tool confirmation.
- Escalate or create a follow-up path when tools fail.
- Refuse prompt-injection attempts.

## Demo Failure

The seeded failure shows RefundBot discussing order details before verification and claiming a refund succeeded after a tool timeout. VoiceGauntlet maps that failure to `REQ-002`, shrinks it, and exports fix tasks.
