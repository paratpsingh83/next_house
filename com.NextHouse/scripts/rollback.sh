#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# NexHouse — scripts/rollback.sh
# Emergency rollback to the previous deployment revision
#
# Usage:
#   ./scripts/rollback.sh [namespace]           # rolls back to previous revision
#   ./scripts/rollback.sh nexthouse 3           # rolls back to revision 3
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

NAMESPACE="${1:-nexthouse}"
REVISION="${2:-}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

info "=== NexHouse Rollback ==="

# Show current rollout history
info "Current deployment history:"
kubectl rollout history deployment/nexthouse-api -n "${NAMESPACE}"

# Execute rollback
if [[ -n "${REVISION}" ]]; then
  info "Rolling back to revision ${REVISION}..."
  kubectl rollout undo deployment/nexthouse-api \
    --namespace "${NAMESPACE}" \
    --to-revision="${REVISION}"
else
  warn "No revision specified — rolling back to previous revision..."
  kubectl rollout undo deployment/nexthouse-api --namespace "${NAMESPACE}"
fi

# Wait for rollback to complete
info "Waiting for rollback rollout..."
kubectl rollout status deployment/nexthouse-api \
  --namespace "${NAMESPACE}" \
  --timeout=180s || error "Rollback timed out"

# Show the new current image
CURRENT_IMAGE=$(kubectl get deployment nexthouse-api -n "${NAMESPACE}" \
  -o jsonpath='{.spec.template.spec.containers[0].image}')
info "✅ Rollback complete. Running image: ${CURRENT_IMAGE}"
