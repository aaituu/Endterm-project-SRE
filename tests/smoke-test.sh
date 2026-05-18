#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
IIN="${IIN:-000000000001}"
PASSWORD="${PASSWORD:-Admin123!}"

json() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

echo "Gateway health"
curl -fsS "$BASE_URL/health" | json

echo "Aggregated service status"
curl -fsS "$BASE_URL/api/status" | json

echo "Public content routes"
curl -fsS "$BASE_URL/api/news" | json >/dev/null
curl -fsS "$BASE_URL/api/slides" | json >/dev/null
curl -fsS "$BASE_URL/api/stats" | json >/dev/null
curl -fsS "$BASE_URL/api/academic/classes" | json >/dev/null

echo "Login with existing school platform auth"
LOGIN_RESPONSE="$(curl -sS -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"iin\":\"$IIN\",\"password\":\"$PASSWORD\"}")"

TOKEN="$(printf '%s' "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null || true)"
if [ -z "$TOKEN" ]; then
  echo "$LOGIN_RESPONSE"
  echo "Login did not return a token. Check DB seed/admin password."
  exit 1
fi

echo "Authenticated routes"
curl -fsS "$BASE_URL/api/auth/me" -H "Authorization: Bearer $TOKEN" | json >/dev/null
curl -fsS "$BASE_URL/api/roles" -H "Authorization: Bearer $TOKEN" | json >/dev/null
curl -fsS "$BASE_URL/api/users" -H "Authorization: Bearer $TOKEN" | json >/dev/null
curl -fsS "$BASE_URL/api/notifications" -H "Authorization: Bearer $TOKEN" | json >/dev/null

echo "Metrics sample"
curl -fsS "$BASE_URL/metrics" | head -n 20

echo "Smoke test completed"
