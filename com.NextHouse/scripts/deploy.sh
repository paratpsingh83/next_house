#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# NexHouse — scripts/deploy.sh
# Build → Push → Deploy pipeline script
#
# Usage:
#   ./scripts/deploy.sh [version] [environment]
#   ./scripts/deploy.sh 1.2.3 prod
#   ./scripts/deploy.sh dev dev
#
# Prerequisites:
#   - Docker
#   - kubectl configured for target cluster
#   - AWS CLI (for ECR push)
#   - kustomize
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
APP_VERSION="${1:-latest}"
ENVIRONMENT="${2:-dev}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
ECR_REPO="nexthouse-backend"
IMAGE_NAME="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
K8S_OVERLAY="k8s/overlays/${ENVIRONMENT}"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

info "=== NexHouse Deploy: v${APP_VERSION} → ${ENVIRONMENT} ==="

# ── Step 1: Build Docker image ────────────────────────────────────────────────
info "Building Docker image..."
docker build \
  --build-arg APP_VERSION="${APP_VERSION}" \
  --file docker/Dockerfile \
  --tag "${ECR_REPO}:${APP_VERSION}" \
  --tag "${ECR_REPO}:latest" \
  --cache-from "${ECR_REPO}:latest" \
  . || error "Docker build failed"

info "Image built: ${ECR_REPO}:${APP_VERSION}"

# ── Step 2: Push to ECR (skip for local dev) ──────────────────────────────────
if [[ "${ENVIRONMENT}" != "local" ]]; then
  if [[ -z "${AWS_ACCOUNT_ID}" ]]; then
    error "AWS_ACCOUNT_ID is not set. Export it before running this script."
  fi

  info "Authenticating with ECR..."
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

  info "Tagging image for ECR..."
  docker tag "${ECR_REPO}:${APP_VERSION}" "${IMAGE_NAME}:${APP_VERSION}"
  docker tag "${ECR_REPO}:${APP_VERSION}" "${IMAGE_NAME}:latest"

  info "Pushing to ECR..."
  docker push "${IMAGE_NAME}:${APP_VERSION}"
  docker push "${IMAGE_NAME}:latest"
  info "Image pushed: ${IMAGE_NAME}:${APP_VERSION}"
fi

# ── Step 3: Update image tag in Kustomize overlay ─────────────────────────────
info "Updating image tag in ${K8S_OVERLAY}..."
cd "${K8S_OVERLAY}" && \
  kustomize edit set image "nexthouse-backend=${IMAGE_NAME}:${APP_VERSION}" && \
  cd - > /dev/null

# ── Step 4: Deploy to Kubernetes ──────────────────────────────────────────────
info "Applying Kubernetes manifests (${ENVIRONMENT})..."
kubectl apply -k "${K8S_OVERLAY}" --dry-run=client || error "Dry-run validation failed"
kubectl apply -k "${K8S_OVERLAY}"

# ── Step 5: Wait for rollout ──────────────────────────────────────────────────
info "Waiting for rollout to complete..."
kubectl rollout status deployment/nexthouse-api \
  --namespace nexthouse \
  --timeout=300s || {
  warn "Rollout timed out. Fetching pod status..."
  kubectl get pods -n nexthouse -l app.kubernetes.io/component=api
  kubectl describe pods -n nexthouse -l app.kubernetes.io/component=api | tail -30
  error "Deployment failed. Consider rolling back: kubectl rollout undo deployment/nexthouse-api -n nexthouse"
}

# ── Step 6: Verify health ─────────────────────────────────────────────────────
info "Verifying health endpoint..."
sleep 5
HEALTH=$(kubectl exec -n nexthouse \
  $(kubectl get pod -n nexthouse -l app.kubernetes.io/component=api -o jsonpath='{.items[0].metadata.name}') \
  -- sh -c 'wget -qO- http://localhost:8080/actuator/health 2>/dev/null' || echo '{}')

if echo "${HEALTH}" | grep -q '"status":"UP"'; then
  info "✅ Deployment successful! NexHouse v${APP_VERSION} is UP on ${ENVIRONMENT}"
else
  warn "Health check returned: ${HEALTH}"
  warn "Deployment completed but health check did not return UP status"
fi

info "=== Deploy complete ==="
