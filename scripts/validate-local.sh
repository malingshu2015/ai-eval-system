#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_VENV="${ROOT_DIR}/backend/venv/bin"

if [ ! -x "${BACKEND_VENV}/pytest" ]; then
  echo "backend/venv is not ready. Please create the backend virtualenv and install requirements first." >&2
  exit 1
fi

echo "==> Backend acceptance tests"
cd "${ROOT_DIR}"
"${BACKEND_VENV}/pytest" "backend/tests/test_rbac_acceptance.py" "backend/tests/test_seed_poc_catalog.py" -q

echo "==> Frontend type check"
cd "${ROOT_DIR}/frontend"
npx tsc -b

echo "==> Frontend smoke E2E"
npm run e2e -- --project=chromium

echo "==> Local validation completed"
