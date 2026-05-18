# School Platform

Рабочий сайт: `http://localhost:8088`

Это текущая архитектура проекта:

```text
frontend/              React + Nginx
backend/src/           общий backend-код, routes, services, migrations
backend/services/      api-gateway и микросервисы
db/init/               init SQL для fresh PostgreSQL volume
monitoring/            Prometheus + Grafana config
k8s/                   Kubernetes manifests
terraform/             Google Cloud VM infrastructure
ansible/               deploy на VM
docker-compose.yml     локальный Docker Compose
docker-compose.swarm.yml
scripts/               healthcheck и DB migration helpers
```

## Env

Для первого запуска:

```bash
cp .env.example .env
```

Да, значения из `.env.example` нужно перенести в `.env`, но не слепо: обязательно поменяй секреты.

Минимум заменить:

```env
DB_PASSWORD=...
JWT_SECRET=...
GRAFANA_ADMIN_PASSWORD=...
```

Telegram включается только если реально нужен:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_POLLING_ENABLED=false
```

В проекте должен быть один главный env-файл: `.env` в корне. `backend/.env` больше не используется, чтобы секреты не дублировались. `.env` добавлен в `.gitignore` и `.dockerignore`.

## Docker Compose

Запуск всего проекта:

```bash
docker compose -f docker-compose.yml up -d --build
```

Открыть:

```text
Frontend:   http://localhost:8088
Gateway:    http://localhost:8080
Prometheus: http://localhost:9090
Grafana:    http://localhost:3000
```

Проверка контейнеров:

```bash
docker compose -f docker-compose.yml ps
```

Остановить без удаления базы:

```bash
docker compose -f docker-compose.yml down
```

Удалить всё вместе с volume базы:

```bash
docker compose -f docker-compose.yml down -v
```

## Database

Миграции запускаются отдельным контейнером `db-migrate`. Он ведёт таблицу `schema_migrations`, поэтому повторный запуск не должен дублировать миграции.

Запустить миграции вручную:

```bash
./scripts/db-migrate.sh
```

Проверить применённые миграции:

```bash
docker compose -f docker-compose.yml exec -T postgres \
  psql -U postgres -d school_db \
  -c "select filename, applied_at from schema_migrations order by filename;"
```

Проверить важные таблицы:

```bash
docker compose -f docker-compose.yml exec -T postgres \
  psql -U postgres -d school_db \
  -c "select table_name from information_schema.tables where table_schema='public' and table_name in ('event_types','events','competition_names','user_ratings','site_content','teacher_courses','user_import_batches') order by table_name;"
```

Должен быть результат примерно такой:

```text
competition_names
event_types
events
site_content
teacher_courses
user_import_batches
user_ratings
```

Логи базы:

```bash
docker compose -f docker-compose.yml logs --tail=200 postgres
```

## Healthchecks

Все основные сервисы имеют `/health`.

Проверить всё одной командой:

```bash
./scripts/check-health.sh
```

Отдельные проверки:

```bash
curl http://localhost:8088/health
curl http://localhost:8080/health
curl http://localhost:8080/api/status
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health
curl http://localhost:3008/health
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
curl http://localhost:9100/metrics
```

Нормальный результат для backend-сервиса:

```json
{"status":"ok","service":"auth-service"}
```

Нормальный результат gateway status:

```json
{"status":"ok","service":"api-gateway","checks":[{"service":"auth","status":"ok"}]}
```

## Smoke Test

```bash
./tests/smoke-test.sh
```

Должен закончиться:

```text
Smoke test completed
```

## Prometheus

Prometheus запускается вместе с Docker Compose.

Открыть:

```text
http://localhost:9090
```

Targets:

```text
Status -> Targets
```

Должны быть `UP`:

```text
api-gateway
auth-service
user-service
school-service
academic-service
assignment-service
content-service
analytics-service
notification-service
node-exporter
```

Полезные PromQL:

```promql
up
avg(up{job=~"api-gateway|auth-service|user-service|school-service|academic-service|assignment-service|content-service|analytics-service|notification-service"})
sum(rate(http_request_duration_seconds_count[1m])) by (service)
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) by (service) / sum(rate(http_request_duration_seconds_count[5m])) by (service)
```

После изменения `monitoring/prometheus.yml` или `monitoring/alert-rules.yml`:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Grafana

Открыть:

```text
http://localhost:3000
```

Логин берётся из `.env`:

```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

Datasource Prometheus подключается автоматически:

```text
monitoring/grafana/provisioning/datasources/datasources.yml
```

Dashboard подключается автоматически:

```text
monitoring/grafana/dashboards/sre-school-platform-dashboard.json
```

Проверить через API:

```bash
curl -u admin:admin 'http://localhost:3000/api/search?query=School'
```

Должен найти dashboard `SRE School Platform Dashboard`.

## SLI / SLO

Без преувеличения, для этого проекта нормальные целевые значения такие:

| SLI | PromQL | SLO |
| --- | --- | --- |
| Availability | `avg(up{job=~"api-gateway|auth-service|user-service|school-service|academic-service|assignment-service|content-service|analytics-service|notification-service"})` | `>= 0.99` |
| p95 latency | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))` | `<= 2s` для текущего Docker/GCP VM запуска |
| 5xx error rate | `sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) by (service) / sum(rate(http_request_duration_seconds_count[5m])) by (service)` | `<= 0.01` |
| Request rate | `sum(rate(http_request_duration_seconds_count[1m])) by (service)` | не SLO, просто нагрузка |

Пример ожидаемого результата:

```text
Availability: 1.0
p95 latency: usually below 2 seconds
5xx error rate: 0 or below 0.01
All Prometheus targets: UP
```

Alert rules лежат тут:

```text
monitoring/alert-rules.yml
```

## Docker Swarm

Сборка образов:

```bash
docker compose -f docker-compose.yml build
```

Инициализация Swarm:

```bash
docker swarm init
```

Перед `docker stack deploy` экспортируй `.env`, потому что Swarm не всегда читает `.env` так же удобно, как Compose:

```bash
set -a
source .env
set +a
```

Деплой:

```bash
docker stack deploy -c docker-compose.swarm.yml school
```

Проверка:

```bash
docker stack services school
docker stack ps school
```

Удалить stack:

```bash
docker stack rm school
```

Важно: `db-migrate` в Swarm описан как job. На single-node Swarm он применит миграции один раз. Для multi-node Swarm лучше хранить образы в registry, а не как `:local`.

## Kubernetes

Для локального Minikube:

```bash
minikube start
eval $(minikube docker-env)
docker compose -f docker-compose.yml build
```

Применить манифесты:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/app-deployments.yaml
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/ingress.yaml
```

Проверка:

```bash
kubectl get pods -n school-platform
kubectl get svc -n school-platform
kubectl logs -n school-platform job/db-migrate
```

Port-forward:

```bash
kubectl port-forward -n school-platform svc/frontend-service 8088:80
kubectl port-forward -n school-platform svc/api-gateway 8080:8080
kubectl port-forward -n school-platform svc/prometheus 9090:9090
kubectl port-forward -n school-platform svc/grafana 3000:3000
```

Для GKE нужно сначала запушить образы в Artifact Registry и заменить image names в `k8s/*.yaml`.

## Terraform For Google Cloud

Terraform создаёт Google Compute Engine VM с Docker и Docker Compose.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
terraform output
```

После apply возьми IP:

```bash
terraform output server_external_ip
```

Важно для production: в `terraform.tfvars` замени:

```hcl
ssh_source_ranges = ["YOUR_IP/32"]
app_source_ranges = ["YOUR_IP/32"]
```

Удалить инфраструктуру:

```bash
terraform destroy
```

## Ansible Deploy To Google VM

После Terraform:

```bash
cp ansible/inventory.example.ini ansible/inventory.ini
```

В `ansible/inventory.ini` поставь внешний IP VM.

Перед деплоем экспортируй секреты локально:

```bash
export DB_PASSWORD='change-this-database-password'
export JWT_SECRET='change-this-to-a-long-random-secret'
export GRAFANA_ADMIN_PASSWORD='change-this-grafana-password'
```

Если не установлен collection:

```bash
ansible-galaxy collection install -r ansible/requirements.yml
```

Деплой:

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

Ansible делает:

```text
1. Устанавливает Docker на VM.
2. Копирует проект в /opt/school-platform.
3. Создаёт .env на сервере из template.
4. Запускает docker compose up -d --build.
5. Запускает db-migrate.
6. Проверяет frontend /health и gateway /api/status.
```
