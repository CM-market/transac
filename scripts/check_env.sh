#!/usr/bin/env bash
#
# check_env.sh — Verify the .env.production.example template is complete and
# does not leak secret defaults.
#
# 1. Every ${VAR} referenced by docker-compose.yml must be enumerated in the
#    template (SENTINEL M3: no partial env template).
# 2. Warn if a known SECRET variable carries a non-empty default in the compose
#    file (operator must fill real secrets, never commit/default them).
#
# Usage:  ./scripts/check_env.sh
# Env:    COMPOSE_FILE (default: docker-compose.yml)
#         ENV_TEMPLATE (default: .env.production.example)
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_TEMPLATE="${ENV_TEMPLATE:-.env.production.example}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "ERROR: compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_TEMPLATE}" ]]; then
  echo "ERROR: env template not found: ${ENV_TEMPLATE}" >&2
  exit 1
fi

fail=0

# --- 1. Every ${VAR} in the compose must appear in the template -----------
vars="$(grep -oE '\$\{[A-Za-z_][A-Za-z0-9_]*' "${COMPOSE_FILE}" \
        | sed -E 's/^\$\{//' | sort -u)"
missing=""
for v in ${vars}; do
  if ! grep -qE "^[[:space:]]*${v}=" "${ENV_TEMPLATE}"; then
    missing+="  - ${v}\n"
  fi
done
if [[ -n "${missing}" ]]; then
  echo "ERROR: compose references vars missing from ${ENV_TEMPLATE}:" >&2
  echo -e "${missing}" >&2
  fail=1
fi

# --- 2. Secret vars must not carry a non-empty default in compose ---------
# SECRET names that must be provided at deploy time (never defaulted).
secret_names="POSTGRES_PASSWORD JWT_SECRET MINIO_ROOT_PASSWORD AWS_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID"
leaks=""
for name in ${secret_names}; do
  if grep -qE "\$\{${name}:-[^}]*\}" "${COMPOSE_FILE}"; then
    leaks+="  - ${name} has a default in ${COMPOSE_FILE}; ensure it is overridden by .env\n"
  fi
done
if [[ -n "${leaks}" ]]; then
  echo "WARNING: secret vars carry dev-fallback defaults (safe for dev, but they must be" >&2
  echo "         overridden by real values in .env for production):" >&2
  echo -e "${leaks}" >&2
fi

if [[ "${fail}" -eq 1 ]]; then
  echo "FAILED: env template is incomplete." >&2
  exit 1
fi

echo "OK: all \${VAR}s referenced by ${COMPOSE_FILE} are enumerated in ${ENV_TEMPLATE}."
