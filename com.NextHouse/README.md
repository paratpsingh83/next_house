# NexHouse — DevOps Guide

## Quick Start (Local Development)

```bash
# 1. Copy environment template
cp docker/.env.example docker/.env
# Edit docker/.env with your values

# 2. Start full stack
cd docker
docker-compose up -d

# 3. API available at:
#    REST:    http://localhost:8080/api/v1
#    Swagger: http://localhost:8080/swagger-ui/index.html
#    WS:      ws://localhost:8080/ws

# 4. Start dev tools (Kafka UI + Adminer)
docker-compose --profile tools up -d
#    Kafka UI: http://localhost:8090
#    Adminer:  http://localhost:8888
```

## Docker Image

### Build
```bash
docker build -f docker/Dockerfile -t nexthouse-backend:latest .

# With specific version
docker build --build-arg APP_VERSION=1.2.3 -t nexthouse-backend:1.2.3 .
```

### Multi-stage layers (optimised caching)
```
Layer 1: Maven dependencies  (~400 MB, cached when pom.xml unchanged)
Layer 2: Spring Boot loader  (~5 MB,   cached when Spring Boot unchanged)
Layer 3: Snapshot deps       (~1 MB,   cached when SNAPSHOT versions unchanged)
Layer 4: Application code    (~20 MB,  rebuilt on every source change)
Final image:                  ~180 MB  (distroless JRE 21)
```

## Kubernetes Deployment

### Prerequisites
```bash
# Install tools
brew install kubectl kustomize helm

# Configure cluster access (AWS EKS example)
aws eks update-kubeconfig --region ap-southeast-1 --name nexthouse-cluster
```

### First-time setup
```bash
# 1. Apply base manifests
kubectl apply -k k8s/base

# 2. Create secrets (fill in real values first)
kubectl apply -f k8s/base/02-secrets-template.yaml

# 3. Verify everything is running
kubectl get all -n nexthouse
```

### Deploy to production
```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=ap-southeast-1

./scripts/deploy.sh 1.2.3 prod
```

### Deploy to dev
```bash
./scripts/deploy.sh dev dev
```

### Rollback
```bash
# Rollback to previous version
./scripts/rollback.sh

# Rollback to specific revision
./scripts/rollback.sh nexthouse 3
```

## File Structure
```
nexthouse-devops/
├── docker/
│   ├── Dockerfile              Multi-stage build (build + distroless runtime)
│   ├── docker-compose.yml      Full local stack (API + PG + Redis + Kafka)
│   ├── .env.example            Environment variable template
│   ├── .dockerignore
│   └── postgres/
│       └── init.sql            PostGIS extension setup
│
├── k8s/
│   ├── base/                   Base manifests (all environments)
│   │   ├── kustomization.yaml
│   │   ├── 01-namespace-configmap.yaml
│   │   ├── 02-secrets-template.yaml    ← NEVER commit with real values
│   │   ├── 03-api-deployment.yaml      Rolling update, probes, anti-affinity
│   │   ├── 04-api-service-ingress.yaml ClusterIP + NGINX Ingress + TLS
│   │   ├── 05-hpa-pdb.yaml             HPA (2-20 pods) + PodDisruptionBudget
│   │   ├── 06-postgres-statefulset.yaml PostGIS 16
│   │   ├── 07-redis-statefulset.yaml   Redis 7
│   │   ├── 08-network-rbac.yaml        NetworkPolicy + RBAC + ResourceQuota
│   │   └── 09-kafka-statefulset.yaml   Kafka 7 (KRaft, no Zookeeper)
│   │
│   └── overlays/
│       ├── prod/               Production: 4 replicas, larger limits, ECR image
│       └── dev/                Dev: 1 replica, smaller limits, local image
│
└── scripts/
    ├── deploy.sh               Build → ECR push → kubectl apply → health check
    └── rollback.sh             Emergency rollback to previous revision
```

## Architecture Diagram

```
Internet
    │
    ▼
┌─────────────────┐
│  NGINX Ingress  │  TLS termination, rate limiting (200 rps)
│  api.nexthouse  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              nexthouse namespace                     │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │   nexthouse-api (Deployment)             │        │
│  │   replicas: 2–20 (HPA)                  │        │
│  │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │        │
│  │   │ pod  │ │ pod  │ │ pod  │ │ pod  │  │        │
│  │   │:8080 │ │:8080 │ │:8080 │ │:8080 │  │        │
│  │   └──────┘ └──────┘ └──────┘ └──────┘  │        │
│  └──────────────────────────────────────────┘        │
│         │            │            │                   │
│         ▼            ▼            ▼                   │
│  ┌────────────┐ ┌─────────┐ ┌─────────┐              │
│  │ PostgreSQL │ │  Redis  │ │  Kafka  │              │
│  │ StatefulSet│ │StatefulS│ │StatefulS│              │
│  │ + PostGIS  │ │ 7.2     │ │ KRaft   │              │
│  │ 100Gi gp3  │ │10Gi gp3 │ │50Gi gp3 │              │
│  └────────────┘ └─────────┘ └─────────┘              │
└─────────────────────────────────────────────────────┘
```

## Scaling Behaviour

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU    | >70% avg  | Scale up (max 4 pods/60s) |
| Memory | >80% avg  | Scale up |
| Cool-down (down) | 5 min sustained | Scale down (max 2 pods/120s) |
| Min replicas | Always | 2 (HA) |
| Max replicas | Hard limit | 20 |

## Secrets Management (Production)

Use **AWS Secrets Manager + External Secrets Operator**:
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# Then create an ExternalSecret CR pointing to AWS Secrets Manager
# See k8s/base/02-secrets-template.yaml for the template
```

Never store real secret values in git. The `02-secrets-template.yaml` contains
only placeholder values.
