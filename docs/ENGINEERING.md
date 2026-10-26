# Engineering quality bar

Practices that protect the MVP during pilot releases.

## CI

Every push/PR to `main` / `master` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (Node **24** from [`.nvmrc`](../.nvmrc); duplicate runs on the same ref are cancelled):

1. `npm run typecheck` (SPA + `supabase/functions` Edge shared code)
2. `npm run lint` (SPA `src/`, `tests/`, Vite/Vitest configs — not Edge Functions)
3. `npm run test`
4. `npm run build`

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Unit tests (Vitest)

Pure logic — no live Discord or Supabase:

| Area | Location |
|------|----------|
| Client validation / policy | `src/lib/eventSpec.test.ts` |
| Client ↔ Edge validation parity | `tests/validationParity.test.ts` |
| Event types, gamertag, datetime | `src/lib/*.test.ts` |
| Worker proxy / OG | `tests/originHeaders.test.ts`, `tests/railwayProxy.test.ts`, `tests/supabaseProxy.test.ts`, `tests/sitePageMeta.test.ts` |
| Edge slugify | `tests/slugify.test.ts` |

When changing validation rules, update **both** `src/lib/eventSpec.ts` and `supabase/functions/_shared/eventSpec.ts`, and keep `validationCodes.ts` copies identical.

## Client reads (Edge vs PostgREST)

Localhost Vite `/supabase` can hide PostgREST bugs until `forza.events`. Public event data: Edge `browse-events` first; PostgREST fallback only behind `canUsePostgrestReads()`. New `.from('events'|'event_results'|…)` without that gate fails CI (`tests/postgrestReads.test.ts`). `createSupabaseFetch` re-applies `apikey` on Activity and origin `/supabase`.

## API error codes

- Edge: `{ "error": "…", "code": "BOT_CANNOT_POST" }` via `appErrorResponse()` / `internalErrorResponse()`.
- Client: `invoke()` throws `ApiRequestError`; UI shows `err.message` (`mapApiError()`). Match auth failures on `code`/`status`, never i18n copy.
- i18n keys: `errors.*` and `validation.*` in `src/i18n/locales/`.

## Manual E2E (Discord Activity)

Not in CI. Before pilot sign-off: [`E2E.md`](E2E.md) (P0 on deploy day, P1–P2 during pilot week).

## Dead code (Knip)

Optional, not a CI gate: `npx knip` — [`knip.json`](../knip.json) (`src/main.tsx` only). Many unused-export hits are shared UI tokens or Edge parity helpers. Do not delete solely because Knip flags them.

## Lint (ESLint)

[`eslint.config.js`](../eslint.config.js) — `src/`, `tests/`, Vite/Vitest configs. Deno Edge Functions are excluded.

## Not in scope yet

- ESLint on Supabase Edge Functions (Deno)
- Playwright / Discord Activity E2E in CI
- Shared npm package for client + Edge
