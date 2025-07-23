# JFrog Artifactory Setup Guide

This guide provides step-by-step instructions for setting up JFrog Artifactory to work with the OnlySaid project's CI/CD pipeline.

## Overview

The OnlySaid project uses JFrog Artifactory for:
- **Docker Image Management** - Storing built container images
- **Electron Application Distribution** - Hosting desktop app installers
- **Artifact Versioning** - Managing build artifacts across environments
- **Security Scanning** - Vulnerability assessment of dependencies

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CI/CD Pipeline│───▶│  JFrog Artifactory│───▶│  Deployment     │
│                 │    │                  │    │                 │
│ - GitHub Actions│    │ - Docker Registry│    │ - Kubernetes    │
│ - GitLab CI     │    │ - Generic Repos  │    │ - Local Deploy  │
│ - Build Scripts │    │ - Helm Charts    │    │ - Docker Compose│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Access
- JFrog Artifactory instance (Cloud or Self-Hosted)
- Admin or Repository Manager permissions
- Network access to `1bucket.oneas1a.com:8080` (as per your config)

### Required Tools
- JFrog CLI 2.x
- Docker with BuildKit support
- curl (for REST API calls)

## 1. JFrog Artifactory Configuration

### 1.1 Repository Setup

Create the following repositories in your JFrog Artifactory:

#### Docker Repositories
```bash
# Main application Docker repository
Repository Key: oa-onlysaid-app-docker-dev-local
Repository Type: Docker (Local)
Registry Port: 8080
Description: OnlySaid application Docker images for development

# Production Docker repository (optional)
Repository Key: oa-onlysaid-app-docker-prod-local
Repository Type: Docker (Local)
Registry Port: 8081
Description: OnlySaid application Docker images for production
```

#### Generic Repositories
```bash
# Electron application repository
Repository Key: oa-onlysaid-electron-dev-local
Repository Type: Generic (Local)
Description: OnlySaid Electron desktop application installers

# Helm charts repository
Repository Key: oa-onlysaid-helm-local
Repository Type: Helm (Local)
Description: OnlySaid Kubernetes Helm charts
```

### 1.2 User and Permissions Setup

#### Create Service Account
1. Navigate to **Administration** → **Identity and Access** → **Users**
2. Click **New User**
3. Configure:
   ```
   Username: onlysaid-ci
   Email: ci@onlysaid.com
   Password: [Generate secure password]
   Admin: No
   ```

#### Create Permission Target
1. Navigate to **Administration** → **Identity and Access** → **Permissions**
2. Click **New Permission**
3. Configure:
   ```
   Permission Name: onlysaid-ci-permissions
   
   Repositories:
   - oa-onlysaid-app-docker-dev-local (Deploy/Cache)
   - oa-onlysaid-electron-dev-local (Deploy/Cache)
   - oa-onlysaid-helm-local (Deploy/Cache)
   
   Users: onlysaid-ci
   Actions: Read, Deploy, Delete, Manage, Annotate
   ```

## 2. Docker Registry Configuration

### 2.1 Docker Daemon Setup

Configure Docker to work with your JFrog Docker registry:

```bash
# Create or update Docker daemon configuration
sudo mkdir -p /etc/docker

# Add insecure registry configuration (for HTTP on port 8080)
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "insecure-registries": ["1bucket.oneas1a.com:8080"],
  "registry-mirrors": [],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker daemon
sudo systemctl restart docker
```

### 2.2 Docker Login

```bash
# Login to JFrog Docker registry
docker login 1bucket.oneas1a.com:8080
# Username: onlysaid-ci
# Password: [your service account password]

# Verify login
docker info | grep -A 10 "Registry Mirrors"
```

## 3. JFrog CLI Setup

### 3.1 Installation

```bash
# Linux/macOS
curl -fL https://getcli.jfrog.io | sh
sudo mv jfrog /usr/local/bin/

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://releases.jfrog.io/artifactory/jfrog-cli/v2/[RELEASE]/jfrog-cli-windows-amd64/jfrog.exe" -OutFile "jfrog.exe"
```

### 3.2 Configuration

```bash
# Configure JFrog CLI
jfrog config add onlysaid-server \
  --artifactory-url=http://1bucket.oneas1a.com:8080/artifactory \
  --user=onlysaid-ci \
  --password=[your-password] \
  --interactive=false

# Test connection
jfrog rt ping --server-id=onlysaid-server

# Set as default server
jfrog config use onlysaid-server
```

## 4. Environment Variables and Secrets

### 4.1 GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `JFROG_URL` | JFrog Artifactory URL | `http://1bucket.oneas1a.com:8080` |
| `JFROG_USER` | JFrog service account username | `onlysaid-ci` |
| `JFROG_USER_PASSWORD` | JFrog service account password | `[secure-password]` |
| `JFROG_REGISTRY` | Docker registry URL | `1bucket.oneas1a.com:8080` |

### 4.2 GitLab CI Variables

For GitLab CI, add these variables in **Settings** → **CI/CD** → **Variables**:

```bash
JFROG_URL: http://1bucket.oneas1a.com:8080
JFROG_USER: onlysaid-ci
JFROG_USER_PASSWORD: [secure-password]
JFROG_SERVER_ID: onlysaid-server
DOCKER_REGISTRY_HOST: 1bucket.oneas1a.com:8080
```

## 5. Testing the Setup

### 5.1 Docker Image Build and Push Test

```bash
# Build a test image
docker build -t test-image:latest -f - . << 'EOF'
FROM alpine:latest
RUN echo "JFrog test image" > /test.txt
CMD ["cat", "/test.txt"]
EOF

# Tag for JFrog registry
docker tag test-image:latest 1bucket.oneas1a.com:8080/oa-onlysaid-app-docker-dev-local/test-image:latest

# Push to JFrog
docker push 1bucket.oneas1a.com:8080/oa-onlysaid-app-docker-dev-local/test-image:latest

# Verify in JFrog UI
# Navigate to Artifactory → Artifacts → oa-onlysaid-app-docker-dev-local
```

### 5.2 Generic Artifact Upload Test

```bash
# Create test file
echo "JFrog artifact test" > test-artifact.txt

# Upload using JFrog CLI
jfrog rt u test-artifact.txt oa-onlysaid-electron-dev-local/test/

# Upload using curl
curl -u onlysaid-ci:[password] \
  -T test-artifact.txt \
  "http://1bucket.oneas1a.com:8080/artifactory/oa-onlysaid-electron-dev-local/test/test-artifact.txt"

# Clean up
rm test-artifact.txt
```

## 6. CI/CD Pipeline Integration

### 6.1 GitHub Actions Integration

The existing workflows in your project already include JFrog integration. Key sections:

```yaml
# Docker login
- name: Login to JFrog Docker Registry
  run: |
    echo "${{ secrets.JFROG_USER_PASSWORD }}" | docker login \
      ${{ secrets.JFROG_REGISTRY }} \
      -u "${{ secrets.JFROG_USER }}" \
      --password-stdin

# Image push
- name: Push Docker Images
  run: |
    docker push ${{ secrets.JFROG_REGISTRY }}/oa-onlysaid-app-docker-dev-local/onlysaid-app:dev-${{ github.sha }}
    docker push ${{ secrets.JFROG_REGISTRY }}/oa-onlysaid-app-docker-dev-local/onlysaid-socket:dev-${{ github.sha }}
```

### 6.2 GitLab CI Integration

Your `.gitlab-ci.yml` includes JFrog setup:

```yaml
variables:
  DOCKER_REGISTRY_HOST: "1bucket.oneas1a.com:8080"
  
.load_secrets: &load_secrets
  - |
    export DOCKER_REGISTRY="${DOCKER_REGISTRY_HOST}/oa-onlysaid-app-docker-dev-local"
    echo "Docker Registry: ${DOCKER_REGISTRY}"
```

## 7. Monitoring and Maintenance

### 7.1 Repository Health Checks

```bash
# Check repository disk usage
jfrog rt curl -X GET "/api/storageinfo"

# List repositories
jfrog rt curl -X GET "/api/repositories"

# Check repository configuration
jfrog rt curl -X GET "/api/repositories/oa-onlysaid-app-docker-dev-local"
```

### 7.2 Cleanup Policies

Configure automatic cleanup in JFrog:

1. Navigate to **Administration** → **Repositories** → **Repository**
2. Select your repository
3. Go to **Advanced** tab
4. Configure:
   ```
   Max Unique Tags: 10
   Cleanup Policy: Delete artifacts older than 30 days
   Disk Usage: Alert at 80%, Clean at 90%
   ```

### 7.3 Backup and Recovery

```bash
# Export repository configuration
jfrog rt curl -X GET "/api/repositories/oa-onlysaid-app-docker-dev-local" > repo-config-backup.json

# Create repository backup
jfrog rt export-config --target=./backup/

# Restore repository configuration
jfrog rt import-config --from=./backup/
```

## 8. Security Best Practices

### 8.1 Access Tokens

Instead of passwords, use access tokens:

```bash
# Create access token via REST API
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "username": "onlysaid-ci",
    "expires_in": 31536000,
    "description": "CI/CD Pipeline Token"
  }' \
  -u onlysaid-ci:[password] \
  "http://1bucket.oneas1a.com:8080/artifactory/api/security/token"

# Use token in CI/CD
export JFROG_ACCESS_TOKEN="[token-value]"
```

### 8.2 Network Security

```bash
# Restrict access by IP (if needed)
# In JFrog UI: Administration → Security → Settings → Network
# Add allowed IP ranges for CI/CD runners
```

### 8.3 SSL/TLS Configuration

For production, enable HTTPS:

```bash
# Update Docker daemon.json
{
  "registry-mirrors": ["https://1bucket.oneas1a.com"],
  "insecure-registries": []
}

# Update CI/CD variables
JFROG_URL: https://1bucket.oneas1a.com
JFROG_REGISTRY: 1bucket.oneas1a.com
```

## 9. Troubleshooting

### 9.1 Common Issues

#### Docker Login Failures
```bash
# Check Docker daemon status
sudo systemctl status docker

# Verify insecure registry configuration
cat /etc/docker/daemon.json

# Test direct connection
curl -I http://1bucket.oneas1a.com:8080/artifactory/api/system/ping
```

#### Upload Failures
```bash
# Check JFrog CLI configuration
jfrog config show

# Test with verbose logging
jfrog rt u test.txt repo-name/ --dry-run --detailed-summary

# Check disk space and permissions
jfrog rt curl -X GET "/api/system/info"
```

#### Network Connectivity
```bash
# Test network connectivity
telnet 1bucket.oneas1a.com 8080

# Check DNS resolution
nslookup 1bucket.oneas1a.com

# Test with curl
curl -v http://1bucket.oneas1a.com:8080/artifactory/api/system/ping
```

### 9.2 Logs and Debugging

```bash
# JFrog CLI debug logs
export JFROG_CLI_LOG_LEVEL=DEBUG
jfrog rt u test.txt repo-name/

# Docker daemon logs
sudo journalctl -u docker.service -f

# GitLab CI debug
# Add to .gitlab-ci.yml:
variables:
  CI_DEBUG_TRACE: "true"
```

## 10. Additional Resources

### 10.1 JFrog Documentation
- [JFrog Artifactory User Guide](https://www.jfrog.com/confluence/display/JFROG/JFrog+Artifactory)
- [Docker Registry Setup](https://www.jfrog.com/confluence/display/JFROG/Docker+Registry)
- [JFrog CLI Documentation](https://www.jfrog.com/confluence/display/CLI/JFrog+CLI)

### 10.2 API References
- [Artifactory REST API](https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API)
- [Docker Registry API](https://docs.docker.com/registry/spec/api/)

### 10.3 OnlySaid Specific
- [CI/CD Configuration](ci-cd.md)
- [Apps Setup Guide](appssetup.md)
- [Development Guide](../development.md)

---

This completes the JFrog Artifactory setup for the OnlySaid project. The configuration supports both development and production workflows with proper security, monitoring, and maintenance procedures.
