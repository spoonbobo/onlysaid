#!/bin/bash

# OnlySaid JFrog Artifactory Setup Script
# This script automates the initial setup of JFrog CLI and basic configuration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
JFROG_URL="http://1bucket.oneas1a.com:8080"
JFROG_SERVER_ID="onlysaid-server"
DOCKER_REGISTRY="1bucket.oneas1a.com:8080"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OnlySaid JFrog Artifactory Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_status "Detected Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="mac"
        print_status "Detected macOS"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        print_status "Detected Windows"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Install JFrog CLI
install_jfrog_cli() {
    print_status "Checking JFrog CLI installation..."
    
    if command -v jfrog &> /dev/null; then
        print_status "JFrog CLI already installed: $(jfrog --version)"
        return 0
    fi
    
    print_status "Installing JFrog CLI..."
    
    if [[ "$OS" == "linux" || "$OS" == "mac" ]]; then
        curl -fL https://getcli.jfrog.io | sh
        
        # Move to system path
        if [[ -f "./jfrog" ]]; then
            if [[ "$OS" == "linux" ]]; then
                sudo mv jfrog /usr/local/bin/
            else
                sudo mv jfrog /usr/local/bin/
            fi
            print_status "JFrog CLI installed successfully"
        else
            print_error "Failed to download JFrog CLI"
            exit 1
        fi
    else
        print_warning "Please install JFrog CLI manually for Windows"
        print_warning "Download from: https://releases.jfrog.io/artifactory/jfrog-cli/v2/"
        exit 1
    fi
}

# Configure Docker for insecure registry
configure_docker() {
    print_status "Configuring Docker for JFrog registry..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Create Docker daemon configuration
    DOCKER_CONFIG_DIR="/etc/docker"
    DOCKER_CONFIG_FILE="$DOCKER_CONFIG_DIR/daemon.json"
    
    if [[ "$OS" == "linux" ]]; then
        # Backup existing configuration
        if [[ -f "$DOCKER_CONFIG_FILE" ]]; then
            print_status "Backing up existing Docker configuration..."
            sudo cp "$DOCKER_CONFIG_FILE" "$DOCKER_CONFIG_FILE.backup.$(date +%Y%m%d-%H%M%S)"
        fi
        
        # Create new configuration
        print_status "Creating Docker daemon configuration..."
        sudo mkdir -p "$DOCKER_CONFIG_DIR"
        
        cat <<EOF | sudo tee "$DOCKER_CONFIG_FILE" > /dev/null
{
  "insecure-registries": ["$DOCKER_REGISTRY"],
  "registry-mirrors": [],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
        
        # Restart Docker daemon
        print_status "Restarting Docker daemon..."
        sudo systemctl restart docker
        
        # Wait for Docker to start
        sleep 5
        
        # Verify Docker is running
        if sudo systemctl is-active --quiet docker; then
            print_status "Docker daemon restarted successfully"
        else
            print_error "Failed to restart Docker daemon"
            exit 1
        fi
    else
        print_warning "Docker configuration must be done manually on macOS/Windows"
        print_warning "Add '$DOCKER_REGISTRY' to insecure-registries in Docker Desktop settings"
    fi
}

# Configure JFrog CLI
configure_jfrog_cli() {
    print_status "Configuring JFrog CLI..."
    
    # Check if configuration already exists
    if jfrog config show | grep -q "$JFROG_SERVER_ID" 2>/dev/null; then
        print_warning "JFrog server configuration '$JFROG_SERVER_ID' already exists"
        read -p "Do you want to reconfigure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Skipping JFrog CLI configuration"
            return 0
        fi
        
        # Remove existing configuration
        jfrog config remove "$JFROG_SERVER_ID" --quiet || true
    fi
    
    # Get credentials
    echo
    echo -e "${YELLOW}Please enter your JFrog Artifactory credentials:${NC}"
    read -p "Username (default: onlysaid-ci): " JFROG_USER
    JFROG_USER=${JFROG_USER:-onlysaid-ci}
    
    read -s -p "Password: " JFROG_PASSWORD
    echo
    
    if [[ -z "$JFROG_PASSWORD" ]]; then
        print_error "Password cannot be empty"
        exit 1
    fi
    
    # Configure JFrog CLI
    print_status "Adding JFrog server configuration..."
    jfrog config add "$JFROG_SERVER_ID" \
        --artifactory-url="$JFROG_URL/artifactory" \
        --user="$JFROG_USER" \
        --password="$JFROG_PASSWORD" \
        --interactive=false
    
    # Test connection
    print_status "Testing JFrog connection..."
    if jfrog rt ping --server-id="$JFROG_SERVER_ID"; then
        print_status "JFrog connection successful"
    else
        print_error "Failed to connect to JFrog Artifactory"
        exit 1
    fi
    
    # Set as default
    jfrog config use "$JFROG_SERVER_ID"
    print_status "Set '$JFROG_SERVER_ID' as default JFrog server"
}

# Test Docker registry access
test_docker_registry() {
    print_status "Testing Docker registry access..."
    
    # Get credentials (reuse from CLI configuration if available)
    JFROG_CONFIG=$(jfrog config show | grep -A 20 "$JFROG_SERVER_ID" || echo "")
    
    if [[ -z "$JFROG_CONFIG" ]]; then
        print_warning "JFrog CLI not configured. Skipping Docker registry test."
        return 0
    fi
    
    # Extract username from config
    JFROG_USER=$(echo "$JFROG_CONFIG" | grep "User:" | awk '{print $2}' || echo "")
    
    if [[ -n "$JFROG_USER" ]]; then
        print_status "Testing Docker login for user: $JFROG_USER"
        echo "Please enter your JFrog password for Docker login:"
        
        if docker login "$DOCKER_REGISTRY" --username "$JFROG_USER"; then
            print_status "Docker login successful"
            
            # Test with a simple pull (should fail gracefully if image doesn't exist)
            print_status "Testing Docker registry connectivity..."
            docker pull alpine:latest > /dev/null 2>&1 || true
            
            if docker tag alpine:latest "$DOCKER_REGISTRY/oa-onlysaid-app-docker-dev-local/test:latest" 2>/dev/null; then
                print_status "Docker registry test successful"
                docker rmi "$DOCKER_REGISTRY/oa-onlysaid-app-docker-dev-local/test:latest" 2>/dev/null || true
            else
                print_warning "Docker registry test failed, but basic login worked"
            fi
        else
            print_warning "Docker login failed"
        fi
    else
        print_warning "Could not extract username from JFrog configuration"
    fi
}

# Create environment file template
create_env_template() {
    print_status "Creating environment variables template..."
    
    ENV_FILE=".env.jfrog"
    
    cat <<EOF > "$ENV_FILE"
# JFrog Artifactory Configuration
# Copy these values to your CI/CD environment variables

# Basic Configuration
JFROG_URL=$JFROG_URL
JFROG_USER=onlysaid-ci
JFROG_USER_PASSWORD=[your-password]
JFROG_SERVER_ID=$JFROG_SERVER_ID

# Docker Registry
DOCKER_REGISTRY_HOST=$DOCKER_REGISTRY
DOCKER_REGISTRY=$DOCKER_REGISTRY/oa-onlysaid-app-docker-dev-local

# Repository Names
DOCKER_REPO_DEV=oa-onlysaid-app-docker-dev-local
DOCKER_REPO_PROD=oa-onlysaid-app-docker-prod-local
ELECTRON_REPO=oa-onlysaid-electron-dev-local
HELM_REPO=oa-onlysaid-helm-local

# For GitHub Actions Secrets:
# - JFROG_URL
# - JFROG_USER  
# - JFROG_USER_PASSWORD
# - JFROG_REGISTRY

# For GitLab CI Variables:
# - JFROG_URL
# - JFROG_USER
# - JFROG_USER_PASSWORD
# - JFROG_SERVER_ID
# - DOCKER_REGISTRY_HOST
EOF
    
    print_status "Environment template created: $ENV_FILE"
    print_warning "Remember to update your CI/CD environment variables!"
}

# Display summary
display_summary() {
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Setup Summary${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "JFrog URL: ${BLUE}$JFROG_URL${NC}"
    echo -e "Docker Registry: ${BLUE}$DOCKER_REGISTRY${NC}"
    echo -e "Server ID: ${BLUE}$JFROG_SERVER_ID${NC}"
    echo
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update your CI/CD environment variables (see .env.jfrog)"
    echo "2. Create repositories in JFrog Artifactory:"
    echo "   - oa-onlysaid-app-docker-dev-local (Docker)"
    echo "   - oa-onlysaid-electron-dev-local (Generic)"
    echo "   - oa-onlysaid-helm-local (Helm)"
    echo "3. Configure permissions for the onlysaid-ci user"
    echo "4. Test the CI/CD pipeline"
    echo
    echo -e "${GREEN}Setup completed successfully!${NC}"
}

# Main execution
main() {
    check_os
    install_jfrog_cli
    configure_docker
    configure_jfrog_cli
    test_docker_registry
    create_env_template
    display_summary
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@" 