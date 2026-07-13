#!/usr/bin/env bash
# Invoke process-notifications (outbox delivery + 2h reminder scan).
# Production schedulers:
#   GitHub Actions: .github/workflows/process-notifications.yml (every 5 min — GH minimum)
#   VPS cron:       * * * * * /path/to/scripts/invoke-process-notifications.sh
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

URL="${VITE_SUPABASE_URL%/}/functions/v1/process-notifications"

curl -fsS -X POST "$URL" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${NOTIFICATION_CRON_SECRET}" \
  -d '{"scan_reminders":true}'

echo ""
