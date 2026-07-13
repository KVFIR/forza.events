#!/usr/bin/env bash
# Invoke prune-client-analytics (client_events retention).
# Production schedulers:
#   GitHub Actions: .github/workflows/prune-client-analytics.yml (daily)
#   VPS cron:       0 3 * * * /path/to/scripts/invoke-prune-client-analytics.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${VITE_SUPABASE_URL:=${SUPABASE_URL:?Set VITE_SUPABASE_URL or SUPABASE_URL}}"
: "${VITE_SUPABASE_ANON_KEY:=${SUPABASE_ANON_KEY:?Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY}}"
: "${NOTIFICATION_CRON_SECRET:?Set NOTIFICATION_CRON_SECRET}"

URL="${VITE_SUPABASE_URL%/}/functions/v1/prune-client-analytics"

curl -fsS -X POST "$URL" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${NOTIFICATION_CRON_SECRET}" \
  -d '{"days":90}'

echo ""
