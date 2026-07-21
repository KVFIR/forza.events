#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FUNCTIONS=(
  browse-events
  host-drafts
  token-exchange
  list-guilds
  list-guild-members
  list-channels
  validate-channel
  publish-event
  interactions-endpoint
  save-event
  event-participation
  add-group
  change-group-leader
  balance-groups
  submit-results
  user-profile
  launch-intent
  upload-cover
  process-notifications
  prune-client-analytics
  track-event
  analytics-dashboard
  leaderboard
)

echo "Deploying ${#FUNCTIONS[@]} Supabase Edge Functions..."

for fn in "${FUNCTIONS[@]}"; do
  echo "→ $fn"
  npx supabase@latest functions deploy "$fn" --no-verify-jwt
done

echo "Done."
