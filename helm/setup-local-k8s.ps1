#!/usr/bin/env pwsh
# Setup script for local Kubernetes testing with OnlySaid Helm chart

Write-Host "Setting up local Kubernetes for OnlySaid..." -ForegroundColor Green

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
if (-not (Test-Command "docker")) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if k3d is installed
if (-not (Test-Command "k3d")) {
    Write-Host "Installing k3d..." -ForegroundColor Yellow
    if (Test-Command "choco") {
        choco install k3d -y
    } else {
        Write-Host "Please install Chocolatey or install k3d manually from: https://github.com/k3d-io/k3d/releases" -ForegroundColor Red
        exit 1
    }
}

# Check if helm is installed
if (-not (Test-Command "helm")) {
    Write-Host "Installing Helm..." -ForegroundColor Yellow
    if (Test-Command "choco") {
        choco install kubernetes-helm -y
    } else {
        Write-Host "Please install Chocolatey or install Helm manually from: https://github.com/helm/helm/releases" -ForegroundColor Red
        exit 1
    }
}

# Check if kubectl is installed
if (-not (Test-Command "kubectl")) {
    Write-Host "Installing kubectl..." -ForegroundColor Yellow
    if (Test-Command "choco") {
        choco install kubernetes-cli -y
    } else {
        Write-Host "Please install Chocolatey or install kubectl manually" -ForegroundColor Red
        exit 1
    }
}

# Create k3d cluster
Write-Host "Creating k3d cluster..." -ForegroundColor Yellow
$clusterName = "onlysaid-local"

# Check if cluster already exists
$existingCluster = k3d cluster list --output json | ConvertFrom-Json | Where-Object { $_.name -eq $clusterName }

if ($existingCluster) {
    Write-Host "Cluster '$clusterName' already exists. Deleting and recreating..." -ForegroundColor Yellow
    k3d cluster delete $clusterName
}

# Create new cluster with ingress support
k3d cluster create $clusterName --port "80:80@loadbalancer" --port "443:443@loadbalancer" --agents 2

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create k3d cluster" -ForegroundColor Red
    exit 1
}

# Wait for cluster to be ready
Write-Host "Waiting for cluster to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verify cluster
kubectl cluster-info
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cluster is not ready" -ForegroundColor Red
    exit 1
}

# Add helm repositories
Write-Host "Adding Helm repositories..." -ForegroundColor Yellow
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to add Helm repositories" -ForegroundColor Red
    exit 1
}

# Install NGINX Ingress Controller
Write-Host "Installing NGINX Ingress Controller..." -ForegroundColor Yellow
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller to be ready
Write-Host "Waiting for ingress controller to be ready..." -ForegroundColor Yellow
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s

# Test basic helm functionality
Write-Host "Testing Helm chart..." -ForegroundColor Yellow
$chartPath = ".\onlysaid"

if (-not (Test-Path $chartPath)) {
    Write-Host "❌ Chart directory '$chartPath' not found. Make sure you're running this from the helm directory." -ForegroundColor Red
    exit 1
}

# Lint the chart
Write-Host "Linting Helm chart..." -ForegroundColor Yellow
helm lint $chartPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Helm chart has linting errors" -ForegroundColor Red
    exit 1
}

# Generate manifests to test templates
Write-Host "Testing Helm templates..." -ForegroundColor Yellow
helm template onlysaid-test $chartPath --values "$chartPath\values-local.yaml" --debug --dry-run > /tmp/manifests-test.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Helm template generation failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install the chart: helm install onlysaid-local .\onlysaid --values .\onlysaid\values-local.yaml" -ForegroundColor White
Write-Host "2. Check status: kubectl get all" -ForegroundColor White
Write-Host "3. Port forward to test: kubectl port-forward service/onlysaid-app 3000:3000" -ForegroundColor White
Write-Host "4. Access in browser: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "To clean up: k3d cluster delete $clusterName" -ForegroundColor Yellow 