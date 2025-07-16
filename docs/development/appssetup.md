# OnlySaid Applications Setup Guide

This guide provides step-by-step instructions for setting up the OnlySaid application stack, including Docker installation and configuration for environments with and without GPU support.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Installation](#docker-installation)
- [Environment Setup](#environment-setup)
- [Application Configuration](#application-configuration)
- [Starting the Application](#starting-the-application)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [GPU vs Non-GPU Setup](#gpu-vs-non-gpu-setup)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- **RAM**: 8GB (16GB recommended)
- **Storage**: 20GB free space (SSD recommended)
- **CPU**: 4 cores (8 cores recommended)
- **Network**: Stable internet connection

**Operating System Support:**
- Ubuntu 20.04+ / Debian 11+
- Windows 10/11 with WSL2
- macOS 10.15+
- CentOS 8+ / RHEL 8+

### Required Software

- Docker Engine 24.0+
- Docker Compose 2.0+
- Git 2.30+
- Node.js 20+ (for development)

## Docker Installation

### Ubuntu/Debian

```bash
# Update package index
sudo apt update

# Install required packages
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group (logout and login required)
sudo usermod -aG docker $USER

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### Windows (WSL2)

1. **Install WSL2**:
   ```powershell
   # Run in PowerShell as Administrator
   wsl --install
   ```

2. **Install Docker Desktop**:
   - Download from [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
   - Enable WSL2 integration during installation
   - Ensure "Use WSL 2 based engine" is checked

3. **Configure WSL2**:
   ```bash
   # In WSL2 terminal
   sudo apt update && sudo apt upgrade -y
   ```

### macOS

1. **Install Docker Desktop**:
   - Download from [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
   - Install the .dmg file
   - Start Docker Desktop from Applications

2. **Alternative - Homebrew**:
   ```bash
   # Install Homebrew if not installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Docker
   brew install --cask docker
   ```

### CentOS/RHEL

```bash
# Install required packages
sudo yum install -y yum-utils device-mapper-persistent-data lvm2

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

### Verify Docker Installation

```bash
# Check Docker version
docker --version
docker compose version

# Test Docker installation
docker run hello-world
```

## Environment Setup

### 1. Clone the Repository

```bash
# Clone the OnlySaid repository
git clone https://github.com/onlysaid/onlysaid.git
cd onlysaid
```

### 2. Environment Configuration

Create environment files with your configuration:

```bash
# Copy example environment file
cp .env.example .env
```

**Edit `.env` file with your settings:**

```bash
# Database Configuration
POSTGRES_USER=onlysaid_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=onlysaid_db
PGHOST=onlysaid-psqldb
PGPORT=5432
PGUSER=onlysaid_user
PGPASSWORD=your_secure_password
PGDATABASE=onlysaid_db

# n8n Database
N8N_PGDATABASE=onlysaid_n8n

# Redis Configuration
REDIS_HOST=redis-node-0
REDIS_PORT=6379
REDIS_PASSWORD=bitnami

# Application URLs
CLIENT_URL=http://localhost:3000
SOCKET_SERVER_URL=http://localhost:3001
NEXT_AUTH_URL=http://localhost:3000
KB_URL=http://localhost:9621
MCP_CLIENT_URL=http://localhost:3000

# OAuth Configuration (Get from respective providers)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_BASE_URL=https://api.openai.com/v1

# Agent Configuration
AGENT_HOME_PATH=./storage/agents

# Application Version
NEXT_PUBLIC_VERSION=1.0.0
NODE_ENV=development
```

### 3. Create Required Directories

```bash
# Create storage directories
mkdir -p storage/agents
mkdir -p storage/lightrag/rag_storage
mkdir -p storage/lightrag/inputs
mkdir -p local-files

# Set permissions
chmod -R 755 storage/
chmod -R 755 local-files/
```

### 4. Configure LightRAG Knowledge Base

```bash
# Navigate to knowledge base directory
cd knowledge_base/LightRAG

# Copy example configuration
cp config.ini.example config.ini
cp .env.example .env

# Edit LightRAG configuration
nano config.ini
```

**LightRAG config.ini example:**

```ini
[llm]
# Use local Ollama instance
api_base = http://onlysaid-ollama:11434
api_key = ollama
model = llama3.2:latest

[embedding]
# Use local Ollama for embeddings
api_base = http://onlysaid-ollama:11434
api_key = ollama
model = nomic-embed-text

[graph_storage]
type = networkx

[vector_storage]
type = qdrant
config_dict = {
    "host": "onlysaid-qdrant",
    "port": 6333
}
```

## Application Configuration

### For Systems WITHOUT GPU Support

If your system doesn't have GPU support or you're running on WSL2, use the WSL-specific compose file:

```bash
# Use WSL/CPU-only configuration
cp docker-compose.wsl.yml docker-compose.override.yml
```

This configuration:
- Disables GPU access for STT and Ollama services
- Sets appropriate memory limits
- Removes CUDA environment variables

### For Systems WITH GPU Support

For systems with NVIDIA GPU support:

```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Configure Nginx (Optional)

If you want to use custom domains, edit `/etc/hosts`:

```bash
sudo nano /etc/hosts

# Add these lines
127.0.0.1 onlysaid-dev.com
127.0.0.1 moodle.onlysaid-dev.com
127.0.0.1 n8n.onlysaid-dev.com
```

## Starting the Application

### 1. Build and Start Services

```bash
# Build and start all services
docker compose up -d

# Or start specific services
docker compose up -d onlysaid-psqldb redis-node-5 onlysaid-qdrant
docker compose up -d onlysaid-app onlysaid-socket_server
```

### 2. Initialize Ollama Models

After Ollama starts, download required models:

```bash
# Wait for Ollama to be ready
docker compose logs -f onlysaid-ollama

# Download models (in another terminal)
docker exec onlysaid-ollama ollama pull llama3.2:latest
docker exec onlysaid-ollama ollama pull nomic-embed-text
docker exec onlysaid-ollama ollama pull codellama:latest
```

### 3. Initialize Database

```bash
# Check if database is ready
docker compose logs onlysaid-psqldb

# Database should auto-initialize with seed files
# If needed, manually run migrations
docker compose exec onlysaid-app npm run db:migrate
```

### 4. Start All Services

```bash
# Start remaining services
docker compose up -d
```

## Verification

### Check Service Status

```bash
# Check all services are running
docker compose ps

# Check logs for any issues
docker compose logs
```

### Access Applications

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| **Main App** | http://localhost:3000 | OAuth (Google/GitHub) |
| **Documentation** | http://localhost:43000 | - |
| **Moodle LMS** | http://localhost/moodle | admin / admin123 |
| **n8n Workflows** | http://localhost:5678 | Set on first visit |
| **pgAdmin** | http://localhost:5050 | admin@admin.com / admin |
| **LightRAG API** | http://localhost:9621 | - |
| **Ollama API** | http://localhost:11434 | - |
| **STT Service** | http://localhost:34430 | - |

### Health Checks

```bash
# Test main application
curl http://localhost:3000

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:9621/health
curl http://localhost:11434/api/tags

# Test database connectivity
docker compose exec onlysaid-psqldb psql -U onlysaid_user -d onlysaid_db -c "SELECT version();"
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts

```bash
# Check what's using a port
sudo netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if system Nginx is running
```

#### 2. Permission Issues

```bash
# Fix Docker permissions
sudo chown -R $USER:$USER ~/.docker/
sudo chmod g+s ~/.docker

# Fix application permissions
sudo chown -R $USER:$USER storage/
sudo chown -R $USER:$USER local-files/
```

#### 3. Memory Issues

```bash
# Check system resources
free -h
df -h

# Increase Docker memory limits (Docker Desktop)
# Settings → Resources → Advanced → Memory: 8GB+
```

#### 4. WSL2 Specific Issues

```bash
# Restart WSL2
wsl --shutdown
wsl

# Update WSL2
wsl --update

# Check WSL2 memory
cat /proc/meminfo
```

#### 5. Service Startup Issues

```bash
# Check individual service logs
docker compose logs onlysaid-app
docker compose logs onlysaid-ollama
docker compose logs onlysaid-psqldb

# Restart specific service
docker compose restart onlysaid-app

# Rebuild service
docker compose up -d --build onlysaid-app
```

### Performance Optimization

#### For Limited Resources

```bash
# Start core services only
docker compose up -d onlysaid-psqldb redis-node-5 onlysaid-qdrant
docker compose up -d onlysaid-app onlysaid-socket_server onlysaid-docs

# Optional services (start as needed)
docker compose up -d onlysaid-ollama      # For LLM features
docker compose up -d onlysaid-lightrag    # For knowledge base
docker compose up -d onlysaid-n8n         # For workflows
docker compose up -d onlysaid-moodle      # For LMS features
```

#### Memory Optimization

Edit `docker-compose.yml` to add memory limits:

```yaml
services:
  onlysaid-ollama:
    # ... other config
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

## GPU vs Non-GPU Setup

### Non-GPU Setup (Recommended for Development)

**Advantages:**
- Works on all systems (including WSL2, VMs)
- Lower resource requirements
- More stable for development
- Faster startup times

**Limitations:**
- Slower AI model inference
- Limited STT processing speed
- CPU-only model processing

**Configuration:**
```bash
# Use WSL-compatible configuration
cp docker-compose.wsl.yml docker-compose.override.yml
```

### GPU Setup (Recommended for Production)

**Advantages:**
- Faster AI model inference
- Better STT performance
- GPU-accelerated processing
- Better user experience

**Requirements:**
- NVIDIA GPU with CUDA support
- NVIDIA drivers installed
- NVIDIA Container Toolkit
- Sufficient GPU memory (8GB+ recommended)

**Configuration:**
```bash
# Use default configuration (includes GPU support)
# Ensure NVIDIA Container Toolkit is installed
nvidia-smi  # Should show GPU information
```

## Next Steps

After successful setup:

1. **Configure OAuth Apps**:
   - [Google OAuth Setup](https://console.developers.google.com/)
   - [GitHub OAuth Setup](https://github.com/settings/applications/new)

2. **Customize Configuration**:
   - Update branding and themes
   - Configure AI models and parameters
   - Set up workflow automation

3. **Production Considerations**:
   - Use external databases for production
   - Set up SSL/TLS certificates
   - Configure monitoring and logging
   - Implement backup strategies

4. **Development Setup**:
   - Install Node.js dependencies locally
   - Set up IDE configuration
   - Configure debugging environments

## Related Documentation

- **[Development Guide](development.md)** - Development environment setup
- **[CI/CD Setup](development/ci-cd.md)** - Automated deployment configuration
- **[Docker Publishing](development/docker-publishing.md)** - Container image management
- **[Rootless Docker Setup](development/rootless-docker-setup.md)** - Enhanced security setup

---

For additional support or questions, please:
- Check the [FAQ](faq.md) section
- Review existing [GitHub Issues](https://github.com/onlysaid/onlysaid/issues)
- Join our community discussions 