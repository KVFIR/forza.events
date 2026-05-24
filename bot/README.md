# Companion bot (planned)

The Discord bot is **not implemented yet**. It will handle background work the Activity cannot do: DM reminders, event threads, participant roles, channel embeds, and scheduled tasks.

- Flows: [`docs/BOT_FLOWS.md`](../docs/BOT_FLOWS.md)
- Stack (planned): discord.js v14, TypeScript, Node.js 20, Supabase service role
- Env vars: see [`docs/PLAN.md`](../docs/PLAN.md#environment-variables)

When scaffolding, use a separate `package.json` in this folder and deploy as an always-on process (Railway / Fly.io).
