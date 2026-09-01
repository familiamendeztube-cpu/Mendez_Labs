#!/usr/bin/env bash
#
# One-shot backend setup for the Mendez Labs terminal.
#
# This links the Supabase project, sets every edge-function secret, and
# deploys all functions. After it finishes, the dashboard, signals, and
# performance pages connect to the real Alpaca account and the sports model.
#
# ── What you need first ─────────────────────────────────────────────────────
#   1. A Supabase access token:  https://supabase.com/dashboard/account/tokens
#   2. Your Alpaca PAPER keys:    https://app.alpaca.markets  (Paper account → API keys)
#   3. (optional) Alpaca LIVE keys + real-money switch
#   4. (optional) The Odds API key + API-Sports key for the sports model
#
# ── How to run ──────────────────────────────────────────────────────────────
#   cp scripts/deploy-backend.env.example scripts/deploy-backend.env
#   # edit scripts/deploy-backend.env and fill in your values
#   bash scripts/deploy-backend.sh
#
# scripts/deploy-backend.env is git-ignored — your keys never get committed.

set -euo pipefail

PROJECT_REF="hzmmjwzaerkwkefapncw"   # from VITE_SUPABASE_URL
ENV_FILE="$(dirname "$0")/deploy-backend.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Run:  cp scripts/deploy-backend.env.example scripts/deploy-backend.env"
  echo "then edit it with your keys and re-run this script."
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in $ENV_FILE}"
: "${ALPACA_PAPER_KEY_ID:?Set ALPACA_PAPER_KEY_ID in $ENV_FILE}"
: "${ALPACA_PAPER_SECRET:?Set ALPACA_PAPER_SECRET in $ENV_FILE}"

export SUPABASE_ACCESS_TOKEN
SB="npx --yes supabase@latest"

echo "→ Linking project $PROJECT_REF"
$SB link --project-ref "$PROJECT_REF"

echo "→ Setting edge-function secrets"
SECRET_ARGS=(
  "TERMINAL_ACCESS_KEY=${TERMINAL_ACCESS_KEY:-312593}"
  "ALPACA_PAPER_KEY_ID=${ALPACA_PAPER_KEY_ID}"
  "ALPACA_PAPER_SECRET=${ALPACA_PAPER_SECRET}"
)
[[ -n "${ANTHROPIC_API_KEY:-}"       ]] && SECRET_ARGS+=( "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" )
[[ -n "${ODDS_API_KEY:-}"            ]] && SECRET_ARGS+=( "ODDS_API_KEY=${ODDS_API_KEY}" )
[[ -n "${API_SPORTS_KEY:-}"          ]] && SECRET_ARGS+=( "API_SPORTS_KEY=${API_SPORTS_KEY}" )
[[ -n "${ALPACA_LIVE_KEY_ID:-}"      ]] && SECRET_ARGS+=( "ALPACA_LIVE_KEY_ID=${ALPACA_LIVE_KEY_ID}" )
[[ -n "${ALPACA_LIVE_SECRET:-}"      ]] && SECRET_ARGS+=( "ALPACA_LIVE_SECRET=${ALPACA_LIVE_SECRET}" )
[[ -n "${ALPACA_LIVE_ORDERS_ENABLED:-}" ]] && SECRET_ARGS+=( "ALPACA_LIVE_ORDERS_ENABLED=${ALPACA_LIVE_ORDERS_ENABLED}" )

$SB secrets set "${SECRET_ARGS[@]}" --project-ref "$PROJECT_REF"

echo "→ Deploying functions"
for fn in alpaca-connector ai-analysis analysis-engine sports-feed sports-odds settle-picks; do
  echo "   • $fn"
  $SB functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo
echo "✓ Done. Reload the terminal — the dashboard should show your Alpaca account."
echo "  If it still says 'not connected', check the keys in $ENV_FILE and re-run."
