#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FUNCTIONS=(
  token-exchange
  list-guilds
  list-channels
  publish-event
  interactions-endpoint
  save-event
  event-participation
  submit-results
  user-profile
  launch-intent
)

echo "Deploying ${#FUNCTIONS[@]} Supabase Edge Functions..."

for fn in "${FUNCTIONS[@]}"; do
  echo "→ $fn"
  npx supabase@latest functions deploy "$fn"
done

echo "Done."
