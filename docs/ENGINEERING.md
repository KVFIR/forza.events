# Engineering quality bar

Practices that protect the frozen MVP during pilot releases.

## CI

Every push/PR to `main` / `master` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (Node **24** from [`.nvmrc`](../.nvmrc), `actions/checkout@v6` + `actions/setup-node@v6`; duplicate runs on the same ref are cancelled):

1. `npm run typecheck` (SPA + `supabase/functions` Edge shared code)
2. `npm run lint` (SPA `src/`, `tests/`, Vite/Vitest configs — not Edge Functions)
3. `npm run test`
4. `npm run build`

Run locally before pushing:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Unit tests (Vitest)

Focus on **pure logic** without Discord or Supabase:

| Area | Location |
|------|----------|
| Client validation / policy | `src/lib/eventSpec.test.ts` |
| Client ↔ Edge validation parity | `tests/validationParity.test.ts` |
| Event types, gamertag, datetime | `src/lib/*.test.ts` |
| Edge slugify | `tests/slugify.test.ts` |

When changing validation rules, update **both** `src/lib/eventSpec.ts` and `supabase/functions/_shared/eventSpec.ts`, and keep `validationCodes.ts` copies identical.

## API error codes

- Edge: `{ "error": "…", "code": "BOT_CANNOT_POST" }` via `appErrorResponse()` / `internalErrorResponse()` in `supabase/functions/_shared/apiResponse.ts`.
- Client: `invoke()` throws `ApiRequestError`; UI should show `err.message` (already mapped with `mapApiError()`).
- i18n keys live under `errors.*` and `validation.*` in `src/i18n/locales/`.

## Manual E2E (Discord Activity)

Automated Activity tests are not in CI. Before pilot sign-off, run [`E2E.md`](E2E.md) (P0 on deploy day, P1–P2 during pilot week).

## Dead code (Knip)

Optional audit on the SPA entry graph (informational — not a CI gate):

```bash
npx knip
```

Config: [`knip.json`](../knip.json) (`src/main.tsx` only — Edge Functions use separate Deno entry points).

The report lists unused exports reachable from the entry graph. Many are intentional shared UI tokens, validation helpers used from tests, or symbols kept for parity with Edge/shared modules. Treat findings as a cleanup backlog; do not delete exports solely because Knip flags them without checking imports and test-only usage.

## Lint (ESLint)

[`eslint.config.js`](../eslint.config.js) — flat config, `typescript-eslint` + `react-hooks` + `react-refresh`. Scope: `src/`, `tests/`, `vite.config.ts`, `vitest.config.ts`. Supabase Edge Functions (Deno) are excluded.

```bash
npm run lint
```

## Not in scope yet

- ESLint on Supabase Edge Functions (Deno)
- Playwright / Discord Activity E2E in CI
- Shared npm package for client + Edge (fixtures + parity tests are enough for pilot)
