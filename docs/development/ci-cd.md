# Continuous Integration and Continuous Deployment (CI/CD)

This document outlines the CI/CD pipeline setup for the onlysaid project, including automated testing, building, and deployment processes across multiple components.

## Overview

The onlysaid project uses GitHub Actions for CI/CD automation, with deployments to JFrog Artifactory for artifact management and containerized deployment using Docker. The pipeline supports multiple application components:

- **Next.js Web Application** - Main web interface
- **Electron Desktop Application** - Cross-platform desktop client  
- **Socket Server** - Real-time communication server
- **Knowledge Base (LightRAG)** - AI knowledge management system
- **Documentation Site** - Docsify-based documentation

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions  │───▶│ JFrog Artifactory│
│                 │    │                  │    │                 │
│ - Source Code   │    │ - Build & Test   │    │ - Docker Images │
│ - Dockerfiles   │    │ - Security Scan  │    │ - Artifacts     │
│ - Workflows     │    │ - Deploy         │    │ - Helm Charts   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Kubernetes     │
                       │  Deployment     │
                       │                 │
                       │ - Production    │
                       │ - Staging       │
                       └─────────────────┘
```

## Prerequisites

### Required Access
- GitHub repository access with Actions enabled
- JFrog Artifactory credentials
- Self-hosted GitHub Actions runner (for security and performance)
- Kubernetes cluster access (for deployment)

### Environment Setup
- Node.js 20+
- Docker Engine
- Helm 3.x
- kubectl configured for target clusters

## GitHub Actions Workflows

### 1. Main Application Pipeline

**File**: `.github/workflows/main.yml`

```yaml
name: Main Application CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'docker-compose.yml'
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
      
      - name: Type checking
        run: npm run type-check

  build-and-push:
    needs: test
    runs-on: self-hosted
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: |
          docker build -t onlysaid-app:${{ github.sha }} .
          docker tag onlysaid-app:${{ github.sha }} ${{ secrets.JFROG_REGISTRY }}/onlysaid-app:latest
      
      - name: Push to JFrog
        run: |
          echo ${{ secrets.JFROG_PASSWORD }} | docker login ${{ secrets.JFROG_REGISTRY }} -u ${{ secrets.JFROG_USERNAME }} --password-stdin
          docker push ${{ secrets.JFROG_REGISTRY }}/onlysaid-app:${{ github.sha }}
          docker push ${{ secrets.JFROG_REGISTRY }}/onlysaid-app:latest
```

### 2. Electron Application Pipeline

**File**: `.github/workflows/electron.yml`

```yaml
name: Electron App CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'onlysaid-electron/**'
  pull_request:
    paths:
      - 'onlysaid-electron/**'

jobs:
  test:
    runs-on: self-hosted
    defaults:
      run:
        working-directory: ./onlysaid-electron
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: onlysaid-electron/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build

  package:
    needs: test
    runs-on: self-hosted
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - name: Package for ${{ matrix.os }}
        working-directory: ./onlysaid-electron
        run: |
          npm ci
          npm run package:${{ matrix.os }}
      
      - name: Upload to JFrog
        run: |
          # Upload packaged applications to JFrog Artifactory
          jfrog rt upload "onlysaid-electron/release/build/*" "onlysaid-electron/${{ github.sha }}/"
```

### 3. Socket Server Pipeline

**File**: `.github/workflows/socket-server.yml`

```yaml
name: Socket Server CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'socket_server/**'
  pull_request:
    paths:
      - 'socket_server/**'

jobs:
  test-and-deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Socket Server Docker image
        run: |
          docker build -f socket_server/Dockerfile.socket_server -t onlysaid-socket:${{ github.sha }} .
          docker tag onlysaid-socket:${{ github.sha }} ${{ secrets.JFROG_REGISTRY }}/onlysaid-socket:latest
      
      - name: Push to JFrog
        if: github.ref == 'refs/heads/main'
        run: |
          echo ${{ secrets.JFROG_PASSWORD }} | docker login ${{ secrets.JFROG_REGISTRY }} -u ${{ secrets.JFROG_USERNAME }} --password-stdin
          docker push ${{ secrets.JFROG_REGISTRY }}/onlysaid-socket:${{ github.sha }}
          docker push ${{ secrets.JFROG_REGISTRY }}/onlysaid-socket:latest
```

### 4. Documentation Pipeline

**File**: `.github/workflows/docs.yml`

```yaml
name: Documentation CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
  pull_request:
    paths:
      - 'docs/**'

jobs:
  build-and-deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      
      - name: Build documentation
        run: |
          docker build -f docker/Dockerfile.docs -t onlysaid-docs:${{ github.sha }} .
          docker tag onlysaid-docs:${{ github.sha }} ${{ secrets.JFROG_REGISTRY }}/onlysaid-docs:latest
      
      - name: Push to JFrog
        if: github.ref == 'refs/heads/main'
        run: |
          echo ${{ secrets.JFROG_PASSWORD }} | docker login ${{ secrets.JFROG_REGISTRY }} -u ${{ secrets.JFROG_USERNAME }} --password-stdin
          docker push ${{ secrets.JFROG_REGISTRY }}/onlysaid-docs:${{ github.sha }}
          docker push ${{ secrets.JFROG_REGISTRY }}/onlysaid-docs:latest
```

## Secret Management

### Required GitHub Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `JFROG_REGISTRY` | JFrog Artifactory registry URL | `mycompany.jfrog.io` |
| `JFROG_USERNAME` | JFrog Artifactory username | `ci-user` |
| `JFROG_PASSWORD` | JFrog Artifactory password/token | `AKCp8...` |
| `KUBECONFIG` | Kubernetes cluster configuration | Base64 encoded kubeconfig |
| `HELM_REPO_URL` | Helm chart repository URL | `https://mycompany.jfrog.io/helm` |

### Setting Up Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each required secret with its corresponding value

## Deployment Process

### 1. Staging Deployment

Automatic deployment to staging environment on successful merge to `develop` branch:

```yaml
deploy-staging:
  needs: build-and-push
  runs-on: self-hosted
  environment: staging
  steps:
    - name: Deploy to Staging
      run: |
        helm upgrade --install onlysaid-staging ./helm/onlysaid \
          --namespace staging \
          --set image.tag=${{ github.sha }} \
          --set environment=staging \
          --values helm/onlysaid/values-staging.yaml
```

### 2. Production Deployment

Manual deployment to production with approval:

```yaml
deploy-production:
  needs: build-and-push
  runs-on: self-hosted
  environment: production
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to Production
      run: |
        helm upgrade --install onlysaid-prod ./helm/onlysaid \
          --namespace production \
          --set image.tag=${{ github.sha }} \
          --set environment=production \
          --values helm/onlysaid/values-production.yaml
```

## Monitoring and Rollback

### Health Checks

Each deployment includes health checks to verify successful deployment:

```yaml
- name: Health Check
  run: |
    kubectl wait --for=condition=ready pod -l app=onlysaid --timeout=300s -n production
    curl -f http://onlysaid-prod.internal/health || exit 1
```

### Rollback Process

If deployment fails or issues are detected:

```bash
# Rollback using Helm
helm rollback onlysaid-prod -n production

# Or rollback to specific revision
helm rollback onlysaid-prod 2 -n production
```

## Best Practices

### 1. Branch Strategy
- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: Feature development branches
- **`hotfix/*`**: Critical production fixes

### 2. Testing Strategy
- **Unit Tests**: Run on every commit
- **Integration Tests**: Run on PR to main/develop
- **E2E Tests**: Run before production deployment
- **Security Scans**: Run on Docker images before push

### 3. Versioning
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases in Git
- Docker images tagged with Git SHA and semantic version

### 4. Security
- Scan Docker images for vulnerabilities
- Use least-privilege access for service accounts
- Rotate secrets regularly
- Enable audit logging

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check workflow logs
   gh run view <run-id> --log
   
   # Debug locally
   docker build -t debug-build .
   docker run -it debug-build /bin/bash
   ```

2. **Deployment Failures**
   ```bash
   # Check pod status
   kubectl get pods -n production
   kubectl describe pod <pod-name> -n production
   kubectl logs <pod-name> -n production
   ```

3. **JFrog Connection Issues**
   ```bash
   # Test JFrog connectivity
   docker login <jfrog-registry>
   curl -u username:password <jfrog-registry>/v2/_catalog
   ```

## Performance Optimization

### Build Optimization
- Use Docker layer caching
- Implement build parallelization
- Cache node_modules between builds
- Use multi-stage Docker builds

### Deployment Optimization
- Implement blue-green deployments
- Use rolling updates for zero-downtime
- Optimize resource requests and limits
- Configure horizontal pod autoscaling

## Compliance and Governance

### Audit Trail
- All deployments logged and tracked
- Git commit history maintained
- Docker image provenance recorded
- Deployment approvals documented

### Quality Gates
- Code coverage threshold: 80%
- Security scan pass required
- Performance tests pass required
- Manual approval for production

## Related Documentation

- **[Docker Publishing](docker-publishing.md)** - Detailed Docker image building and publishing
- **[JFrog Configuration](jfrog-setup.md)** - JFrog Artifactory setup and configuration
- **[Rootless Docker Setup](rootless-docker-setup.md)** - Development environment setup

---

For questions or issues with the CI/CD pipeline, please contact the DevOps team or create an issue in the repository.
