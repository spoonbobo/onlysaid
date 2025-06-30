# OnlySaid Helm Chart

This Helm chart deploys the complete OnlySaid AI-powered application platform on Kubernetes.

## Overview

The OnlySaid platform consists of:

### Core Services
- **onlysaid-app**: Next.js frontend application
- **onlysaid-socket-server**: WebSocket server for real-time communication
- **onlysaid-kb**: Knowledge base service for AI embeddings
- **onlysaid-docs**: Documentation service

### AI/ML Services
- **onlysaid-stt**: Speech-to-text service (GPU required)
- **onlysaid-ollama**: Local LLM service (GPU required)
- **onlysaid-qdrant**: Vector database for embeddings

### Learning Management
- **onlysaid-moodle**: Moodle LMS integration
- **onlysaid-n8n**: Workflow automation platform

### Supporting Services
- **onlysaid-pgadmin**: PostgreSQL administration interface

### Databases (via Bitnami charts)
- **PostgreSQL**: Primary database
- **Redis Cluster**: Caching and session storage (6-node cluster)
- **MariaDB**: Database for Moodle

## Quick Start

### Prerequisites

1. **Docker Desktop** (with Kubernetes enabled) OR **k3d/minikube**
2. **Helm 3.8+**
3. **kubectl**

### Local Testing Setup

```powershell
# Run the setup script (Windows)
cd helm
.\setup-local-k8s.ps1

# Or manually:
# 1. Install tools
choco install k3d kubernetes-helm kubernetes-cli

# 2. Create cluster
k3d cluster create onlysaid-local --port "80:80@loadbalancer"

# 3. Add Helm repos
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### Install the Chart

```bash
# Install with local testing values
helm install onlysaid-local ./onlysaid --values ./onlysaid/values-local.yaml

# Install with production values
helm install onlysaid-prod ./onlysaid --values ./onlysaid/values.yaml

# Install with custom values
helm install onlysaid-custom ./onlysaid --values my-values.yaml
```

### Verify Installation

```bash
# Check all resources
kubectl get all

# Check specific services
kubectl get pods
kubectl get services
kubectl get ingress

# Check logs
kubectl logs -l app=onlysaid-app
```

### Access the Application

```bash
# Port forward to access locally
kubectl port-forward service/onlysaid-app 3000:3000

# Access in browser
open http://localhost:3000

# Or via ingress (if configured)
open http://onlysaid.local
```

## Configuration

### Environment-Specific Values Files

- `values.yaml`: Production configuration
- `values-local.yaml`: Local development/testing
- `values-dev.yaml`: Development environment (create as needed)
- `values-staging.yaml`: Staging environment (create as needed)

### Key Configuration Options

#### Global Settings
```yaml
global:
  imageRegistry: "your-registry.com"
  imagePullSecrets: []

image:
  tag: "latest"

environment: development
namespace: onlysaid-dev
```

#### Service Configuration
```yaml
app:
  enabled: true
  replicaCount: 2
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
  persistence:
    enabled: true
    size: 10Gi
```

#### Database Configuration
```yaml
postgresql:
  enabled: true
  auth:
    postgresPassword: "secure-password"
    username: "onlysaid"
    password: "onlysaid-password"
    database: "onlysaid"

redis:
  enabled: true
  auth:
    password: "redis-password"
  cluster:
    enabled: true
    nodes: 6
```

#### GPU Services (Production Only)
```yaml
stt:
  enabled: true  # Set to false for local testing
  nodeSelector:
    accelerator: nvidia-tesla-gpu
  resources:
    limits:
      nvidia.com/gpu: 1

ollama:
  enabled: true  # Set to false for local testing
  nodeSelector:
    accelerator: nvidia-tesla-gpu
  resources:
    limits:
      nvidia.com/gpu: 1
```

## Testing Commands

### Lint and Validate
```bash
# Lint the chart
helm lint ./onlysaid

# Template dry-run
helm template onlysaid-test ./onlysaid --values ./onlysaid/values-local.yaml --debug

# Install dry-run
helm install onlysaid-test ./onlysaid --values ./onlysaid/values-local.yaml --dry-run --debug
```

### Upgrade and Rollback
```bash
# Upgrade
helm upgrade onlysaid-local ./onlysaid --values ./onlysaid/values-local.yaml

# Check history
helm history onlysaid-local

# Rollback
helm rollback onlysaid-local 1
```

### Debugging
```bash
# Get all resources
kubectl get all -l app.kubernetes.io/instance=onlysaid-local

# Describe problematic pods
kubectl describe pod <pod-name>

# Check logs
kubectl logs -f <pod-name>

# Port forward for direct access
kubectl port-forward service/onlysaid-app 3000:3000
kubectl port-forward service/onlysaid-socket-server 3001:3001
kubectl port-forward service/onlysaid-kb 35430:35430
```

## Architecture

### Service Dependencies

```
onlysaid-app
├── onlysaid-socket-server
├── onlysaid-kb
│   ├── onlysaid-qdrant
│   └── onlysaid-ollama (optional)
├── postgresql
└── redis

onlysaid-moodle
└── mariadb

onlysaid-n8n
└── postgresql

onlysaid-stt (optional, GPU required)
```

### Ingress Routing

| Host | Path | Service | Purpose |
|------|------|---------|---------|
| onlysaid-dev.com | / | onlysaid-app | Main application |
| onlysaid-dev.com | /socket.io | onlysaid-socket-server | WebSocket |
| onlysaid-dev.com | /api/kb | onlysaid-kb | Knowledge base API |
| onlysaid-dev.com | /api/stt | onlysaid-stt | Speech-to-text API |
| onlysaid-dev.com | /docs | onlysaid-docs | Documentation |
| moodle.onlysaid-dev.com | / | onlysaid-moodle | Moodle LMS |
| n8n.onlysaid-dev.com | / | onlysaid-n8n | Workflow automation |
| pgadmin.onlysaid-dev.com | / | onlysaid-pgadmin | Database admin |

## Production Deployment

### Requirements

1. **Kubernetes cluster** with ingress controller
2. **Storage class** for persistent volumes
3. **GPU nodes** (for STT and Ollama services)
4. **Domain names** configured
5. **SSL certificates** (recommended)

### Production Checklist

- [ ] Configure proper resource limits
- [ ] Set up persistent storage
- [ ] Configure ingress with SSL
- [ ] Set strong database passwords
- [ ] Configure monitoring
- [ ] Set up backup strategy
- [ ] Configure GPU node selectors
- [ ] Test disaster recovery

### Example Production Values

```yaml
environment: production
namespace: onlysaid-prod

# Use production images
image:
  tag: "v1.0.0"

# Scaled deployment
app:
  replicaCount: 3
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi

# Production databases
postgresql:
  auth:
    postgresPassword: "super-secure-password"
  primary:
    persistence:
      size: 100Gi
      storageClass: "fast-ssd"

# SSL-enabled ingress
ingress:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  tls:
    - secretName: onlysaid-tls
      hosts:
        - onlysaid.com
```

## Troubleshooting

### Common Issues

1. **Pod stuck in Pending**: Check resource requests and node capacity
2. **ImagePullBackOff**: Verify image registry and pull secrets
3. **CrashLoopBackOff**: Check application logs and health checks
4. **Service not accessible**: Verify service and ingress configuration

### Useful Commands

```bash
# Check cluster resources
kubectl top nodes
kubectl top pods

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Debug specific issues
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous  # Previous container logs

# Network debugging
kubectl exec -it <pod-name> -- nslookup onlysaid-app
kubectl exec -it <pod-name> -- wget -qO- http://onlysaid-app:3000/health
```

## Cleanup

```bash
# Uninstall the release
helm uninstall onlysaid-local

# Delete PVCs (if needed)
kubectl delete pvc -l app.kubernetes.io/instance=onlysaid-local

# Delete cluster (k3d)
k3d cluster delete onlysaid-local
```

## Contributing

1. Make changes to the chart
2. Test locally with `values-local.yaml`
3. Lint with `helm lint ./onlysaid`
4. Update version in `Chart.yaml`
5. Submit pull request

## Support

For issues and questions:
- Check the troubleshooting section above
- Review application logs
- Check Kubernetes events
- Verify configuration matches your environment 