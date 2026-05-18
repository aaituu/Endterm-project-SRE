# Metrics Documentation

Prometheus scrapes only real school-platform services:

- `api-gateway`
- `auth-service`
- `user-service`
- `school-service`
- `academic-service`
- `assignment-service`
- `content-service`
- `analytics-service`
- `notification-service`

Tracked SRE metrics:

- Service uptime: `up`
- Request rate: `sum(rate(http_request_duration_seconds_count[1m])) by (service)`
- p95 latency: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))`
- Error rate: `sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) by (service) / sum(rate(http_request_duration_seconds_count[5m])) by (service)`
- CPU and memory: Node.js default process metrics plus `node-exporter` host metrics

School-specific operational focus:

- Authentication availability: `up{job="auth-service"}`
- Assignment workflow availability: `up{job="assignment-service"}`
- Academic/attendance availability: `up{job="academic-service"}`
- Notification and Telegram availability: `up{job="notification-service"}`

SLO targets:

- Availability: `>= 99%`
- p95 latency: `<= 0.2 seconds`
- Error rate: `<= 1%`
- Request success rate: `>= 99%`
