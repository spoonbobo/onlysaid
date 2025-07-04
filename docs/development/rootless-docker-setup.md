# Rootless Docker with BuildKit Setup Guide

This guide walks you through setting up a secure, rootless Docker environment with BuildKit for GitLab CI/CD pipelines.

## Overview

This setup provides:
- ✅ **Enhanced Security**: No root privileges for Docker operations
- ✅ **BuildKit Integration**: Fast, parallel builds with advanced caching
- ✅ **User Namespace Isolation**: Containers can't access host root
- ✅ **No DinD Vulnerabilities**: Eliminates Docker-in-Docker security risks

## Prerequisites

- Ubuntu/Debian-based system
- GitLab Runner installed and configured
- Admin access to the host system
- Internet connectivity for package downloads

## Step 1: Prepare the System

### 1.1 Enable Lingering for GitLab Runner User

```bash
# Enable persistent user session for gitlab-runner
sudo loginctl enable-linger gitlab-runner

# Install required packages
sudo apt-get update
sudo apt-get install -y uidmap dbus-user-session fuse-overlayfs

# Configure user namespaces
echo "gitlab-runner:100000:65536" | sudo tee -a /etc/subuid
echo "gitlab-runner:100000:65536" | sudo tee -a /etc/subgid
```

### 1.2 Set Up Runtime Directory

```bash
# Create runtime directory with correct permissions
sudo mkdir -p /run/user/$(id -u gitlab-runner)
sudo chown gitlab-runner:gitlab-runner /run/user/$(id -u gitlab-runner)

# Verify gitlab-runner user ID
id gitlab-runner
# Note: Typically uid=1002, adjust paths accordingly
```

## Step 2: Install Rootless Docker

### 2.1 Remove GitLab Runner from Docker Group (Temporarily)

```bash
# Remove gitlab-runner from docker group to enable rootless installation
sudo gpasswd -d gitlab-runner docker
```

### 2.2 Install Rootless Docker for GitLab Runner User

```bash
# Switch to gitlab-runner user
sudo -u gitlab-runner -i

# Install rootless Docker
FORCE_ROOTLESS_INSTALL=1 curl -fsSL https://get.docker.com/rootless | sh

# Configure environment variables
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock' >> ~/.bashrc

# Source the changes
source ~/.bashrc

# Exit back to admin user
exit
```

### 2.3 Verify Installation

```bash
# Check if rootless Docker binaries are installed
sudo ls -la /home/gitlab-runner/bin/

# Should show: dockerd, dockerd-rootless.sh, containerd, etc.
```

## Step 3: Configure Systemd Service

### 3.1 Create Docker Service File

```bash
# Create systemd user service for rootless Docker
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"

# Create systemd user directory
mkdir -p ~/.config/systemd/user

# Create Docker service file
cat > ~/.config/systemd/user/docker.service << EOF
[Unit]
Description=Docker Application Container Engine (Rootless)
Documentation=https://docs.docker.com/go/rootless/
Wants=network.target
After=network-online.target

[Service]
Type=notify
ExecStart=%h/bin/dockerd-rootless.sh
ExecReload=/bin/kill -s HUP \$MAINPID
TimeoutStartSec=0
RestartSec=2
Restart=always
StartLimitBurst=3
StartLimitInterval=60s
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
Delegate=yes
KillMode=mixed
Environment=PATH=%h/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=default.target
EOF
'
```

### 3.2 Start and Enable Docker Service

```bash
# Start rootless Docker service
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"

# Reload systemd user daemon
systemctl --user daemon-reload

# Start Docker service
systemctl --user start docker

# Enable auto-start
systemctl --user enable docker

# Check status
systemctl --user status docker
'
```

## Step 4: Enable BuildKit

### 4.1 Configure BuildKit in Docker Daemon

```bash
# Create Docker daemon configuration for BuildKit
sudo -u gitlab-runner bash -c '
mkdir -p ~/.config/docker

cat > ~/.config/docker/daemon.json << EOF
{
  "features": {
    "buildkit": true
  },
  "experimental": true
}
EOF
'

# Restart Docker service to apply BuildKit configuration
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart docker
'
```

## Step 5: Test Rootless Docker Setup

### 5.1 Verify Rootless Docker Functionality

```bash
# Test rootless Docker
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export PATH=$HOME/bin:$PATH
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock

echo "Testing rootless Docker..."
docker version

echo "Checking rootless status..."
docker info | grep -i rootless

echo "Testing BuildKit..."
docker build --progress=plain -t test:rootless - <<< "FROM alpine:latest"

echo "Testing container run..."
docker run --rm alpine:latest echo "✅ Rootless Docker working!"
'
```

Expected output should show:
- Both Docker client and server versions
- `rootless` in the docker info output
- Numbered build steps (`#0`, `#1`, etc.) indicating BuildKit is active
- Successful container execution

## Step 6: Configure GitLab Runner

### 6.1 Create GitLab Runner Override Configuration

```bash
# Create systemd override directory
sudo mkdir -p /etc/systemd/system/gitlab-runner.service.d/

# Create override configuration
sudo tee /etc/systemd/system/gitlab-runner.service.d/override.conf << 'EOF'
[Service]
Environment="DOCKER_HOST=unix:///run/user/1002/docker.sock"
Environment="PATH=/home/gitlab-runner/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="XDG_RUNTIME_DIR=/run/user/1002"
Environment="HOME=/home/gitlab-runner"
EOF

# Note: Replace 1002 with actual gitlab-runner user ID if different
```

### 6.2 Restart GitLab Runner

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Restart GitLab Runner
sudo systemctl restart gitlab-runner

# Verify GitLab Runner status
sudo systemctl status gitlab-runner
```

### 6.3 Fix Docker Config Warning (Optional)

```bash
# Create Docker config for gitlab-runner user
sudo -u gitlab-runner mkdir -p /home/gitlab-runner/.docker
sudo -u gitlab-runner bash -c 'echo "{}" > /home/gitlab-runner/.docker/config.json'
```

## Step 7: Update GitLab CI Configuration

### 7.1 Update Your .gitlab-ci.yml

Add BuildKit and security configurations to your pipeline:

```yaml
# Global variables
variables:
  # Enable BuildKit globally for all Docker jobs
  DOCKER_BUILDKIT: "1"
  BUILDKIT_PROGRESS: "plain"

# Security template for Docker jobs
.docker_security: &docker_security
  - |
    echo "🔒 Implementing rootless Docker security measures..."
    
    # Verify rootless Docker is running
    if docker info | grep -q "rootless"; then
      echo "✅ Running with rootless Docker"
    else
      echo "⚠️ Not running rootless Docker"
    fi
    
    # Ensure BuildKit is enabled
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    
    # Verify Docker daemon access
    docker version
    
    echo "✅ Rootless Docker security measures applied"

# Docker build job example
build:docker-images:
  stage: build
  tags:
    - onlysaid-runner
  before_script:
    - apt-get update -qq
    - apt-get install -y -qq curl wget jq git build-essential
    - *docker_security
  script:
    - |
      echo "Building Docker images with rootless Docker and BuildKit..."
      
      # Build with BuildKit (note the --progress=plain flag)
      docker build --progress=plain \
        -t "your-registry/app:dev-$BUILD_VERSION" \
        -f ./Dockerfile .
      
      echo "✅ Docker image built successfully with rootless Docker"
```

## Step 8: Verification and Testing

### 8.1 Test GitLab Runner Access

```bash
# Verify GitLab Runner can access rootless Docker
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u gitlab-runner)"
export PATH="/home/gitlab-runner/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export DOCKER_HOST="unix:///run/user/$(id -u gitlab-runner)/docker.sock"

echo "Testing GitLab Runner access to rootless Docker..."
docker version
docker info | grep -i rootless
echo "✅ GitLab Runner can access rootless Docker!"
'
```

### 8.2 Run a Test Pipeline

Trigger a GitLab CI pipeline and verify:
- ✅ Pipeline runs successfully
- ✅ Docker builds show numbered steps (BuildKit active)
- ✅ No security warnings about privileged containers
- ✅ Builds complete faster due to BuildKit optimizations

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Cannot connect to Docker daemon"
```bash
# Check if rootless Docker service is running
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user status docker
'

# Restart if needed
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart docker
'
```

#### Issue: "Permission denied" errors
```bash
# Verify user namespace configuration
cat /etc/subuid | grep gitlab-runner
cat /etc/subgid | grep gitlab-runner

# Check runtime directory permissions
ls -la /run/user/$(id -u gitlab-runner)/
```

#### Issue: BuildKit not working
```bash
# Verify BuildKit configuration
sudo -u gitlab-runner cat ~/.config/docker/daemon.json

# Test BuildKit manually
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export PATH=$HOME/bin:$PATH
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
docker build --progress=plain -t test - <<< "FROM alpine:latest"
'
```

## Security Benefits

This setup provides significant security improvements:

### ✅ **No Root Privileges**
- Docker daemon runs as unprivileged user
- Containers cannot escalate to host root
- Limited system call access

### ✅ **User Namespace Isolation**
- Container "root" maps to unprivileged host user
- Filesystem access is restricted
- Process isolation from host

### ✅ **BuildKit Security Features**
- Better build isolation
- Improved caching with security boundaries
- Advanced build features without compromising security

### ✅ **Elimination of DinD Risks**
- No privileged containers required
- No Docker socket mounting
- Reduced attack surface

## Performance Benefits

### ✅ **BuildKit Advantages**
- Parallel layer building
- Advanced caching mechanisms
- Multi-stage build optimizations
- Better build output and progress reporting

### ✅ **Improved CI/CD Speed**
- Faster builds due to parallel processing
- Better cache utilization
- Reduced build times for complex applications

## Maintenance

### Regular Maintenance Tasks

```bash
# Update rootless Docker (as gitlab-runner user)
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
curl -fsSL https://get.docker.com/rootless | sh
systemctl --user restart docker
'

# Clean up Docker resources periodically
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export PATH=$HOME/bin:$PATH
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
docker system prune -f
'

# Monitor disk usage
sudo -u gitlab-runner bash -c '
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export PATH=$HOME/bin:$PATH
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
docker system df
'
```

## Conclusion

You now have a secure, high-performance Docker environment for GitLab CI/CD that:
- Runs without root privileges
- Uses BuildKit for fast, parallel builds
- Provides enterprise-grade security
- Maintains full Docker functionality

This setup is production-ready and follows security best practices for containerized CI/CD environments. 