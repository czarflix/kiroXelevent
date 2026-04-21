---
inclusion: always
---

# Structure Steering

Expected structure:

- `apps/web`: Next.js App Router application
- `packages/core`: parsers, scenario generation, evaluation, shrinking, adapters
- `packages/mcp`: Kiro MCP server
- `supabase`: migrations and seed notes
- `.kiro/specs`: requirements, design, tasks
- `.kiro/hooks`: Kiro hook JSON files
- `.kiro/steering`: persistent project guidance

Prefer behavior-level modules. Do not duplicate spec parsing or evaluation logic in the UI.
