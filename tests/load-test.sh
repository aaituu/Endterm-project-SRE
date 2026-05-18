#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
REQUESTS="${REQUESTS:-100}"
CONCURRENCY="${CONCURRENCY:-10}"
PATH_TO_TEST="${PATH_TO_TEST:-/api/news}"

echo "Running $REQUESTS requests with concurrency $CONCURRENCY against $BASE_URL$PATH_TO_TEST"

seq 1 "$REQUESTS" | xargs -n1 -P "$CONCURRENCY" -I{} sh -c \
  'curl -fsS "$0$1" >/dev/null' "$BASE_URL" "$PATH_TO_TEST"

echo "Load test completed"
