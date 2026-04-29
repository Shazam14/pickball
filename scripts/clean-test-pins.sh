#!/usr/bin/env bash
# Delete leaked Playwright feedback pins from Supabase.
#
# Why this exists: tests/feedback.spec.js drops a pin at viewport (640, 400)
# and the row persists across runs. Next run's click lands on the saved pin
# (which opens its popup) instead of the composer, so the assertion fails.
# Run this whenever the feedback spec gets flaky — clears every test pin
# (author = 'Sol Arch', message starts with 'Smoke test').
#
# Usage:
#   ./scripts/clean-test-pins.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "missing .env.local — pull it with: vercel env pull .env.local --yes" >&2
  exit 1
fi

set -a; source .env.local; set +a

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local" >&2
  exit 1
fi

deleted=$(curl -fsS -X DELETE \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/feedback_comments?author=eq.Sol+Arch&message=like.Smoke+test%25" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Prefer: return=representation" \
  | jq 'length')

echo "deleted ${deleted} test pin(s)"
