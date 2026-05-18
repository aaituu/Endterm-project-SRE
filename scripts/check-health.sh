#!/usr/bin/env bash
set -euo pipefail

BASE_HOST="${BASE_HOST:-localhost}"

check() {
  local name="$1"
  local url="$2"
  printf '%-24s %s\n' "$name" "$url"
  curl -fsS "$url" >/dev/null
}

check frontend "http://${BASE_HOST}:8088/health"
check api-gateway "http://${BASE_HOST}:8080/health"
check auth-service "http://${BASE_HOST}:3001/health"
check user-service "http://${BASE_HOST}:3002/health"
check school-service "http://${BASE_HOST}:3003/health"
check academic-service "http://${BASE_HOST}:3004/health"
check assignment-service "http://${BASE_HOST}:3005/health"
check content-service "http://${BASE_HOST}:3006/health"
check analytics-service "http://${BASE_HOST}:3007/health"
check notification-service "http://${BASE_HOST}:3008/health"
check prometheus "http://${BASE_HOST}:9090/-/healthy"
check grafana "http://${BASE_HOST}:3000/api/health"
check node-exporter "http://${BASE_HOST}:9100/metrics"

echo "All health checks passed."
