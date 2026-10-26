# Companion bot / Discord integration

There is no standalone always-on bot. Publish, interactions, and DMs run through Edge Functions (`publish-event`, `interactions-endpoint`, `process-notifications`) plus the bot token.

A dedicated companion process may still be added for **threads, roles, and role pings** — [`docs/BACKLOG.md`](../docs/BACKLOG.md).

| Topic | Doc |
|-------|-----|
| Product contract | [`docs/PLAN.md`](../docs/PLAN.md) |
| Shipped state | [`docs/STATUS.md`](../docs/STATUS.md) |
| Env / Worker | [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) |
