#!/usr/bin/env bash
#
# deploy.sh — Deploy the Transac marketplace docker-compose microservice stack.
#
# Validates the compose config, pulls images, starts the stack, waits for the
# backend health endpoint, then prints the public URL and the external
# acceptance checks (see docs/DEPLOYMENT.md "Public link").
#
# Usage:  ./scripts/deploy.sh
# Env:    COMPOSE_FILE (default: docker-compose.yml)
#         PUBLIC_URL   (default: https://transac.site)
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://transac.site}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"

# Load .env if present so ${VAR} interpolation used by the compose file
# (DATABASE_URL, POSTGRES_*, JWT_SECRET, MINIO_*, AWS_*) is available.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "==> Validating compose config (${COMPOSE_FILE})"
docker compose -f "${COMPOSE_FILE}" config --quiet

echo "==> Pulling images"
docker compose -f "${COMPOSE_FILE}" pull

echo "==> Starting services"
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for backend health at ${BACKEND_URL}/healthz"
healthy=0
for _ in $(seq 1 60); do
  if curl -fsS --max-time 5 "${BACKEND_URL}/healthz" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 5
done

if [[ "${healthy}" -ne 1 ]]; then
  echo "ERROR: backend did not become healthy." >&2
  docker compose -f "${COMPOSE_FILE}" logs --tail=80 backend || true
  exit 1
fi
echo "Backend is healthy."

echo
echo "======================================================================="
echo "Deployment complete."
echo "Public URL : ${PUBLIC_URL}"
echo
echo "Acceptance checks (run from an external host):"
echo "  curl -fsS --max-time 10 ${PUBLIC_URL}/"
echo "  curl -fsS --max-time 10 ${PUBLIC_URL}/api/"
echo "======================================================================="
