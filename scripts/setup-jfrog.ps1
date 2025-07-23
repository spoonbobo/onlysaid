# OnlySaid JFrog Artifactory Setup Script (PowerShell)
# This script automates the initial setup of JFrog CLI and basic configuration for Windows

param(
    [string]$JFrogUrl = "http://1bucket.oneas1a.com:8080",
    [string]$ServerId = "onlysaid-server",
    [string]$DockerRegistry = "1bucket.oneas1a.com:8080"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Color functions for output
function Write-Status($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning($Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Header($Message) {
    Write-Host "`n========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

Write-Header "OnlySaid JFrog Artifactory Setup"

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Install JFrog CLI
function Install-JFrogCLI {
    Write-Status "Checking JFrog CLI installation..."
    
    if (Get-Command jfrog -ErrorAction SilentlyContinue) {
        $version = & jfrog --version 2>&1
        Write-Status "JFrog CLI already installed: $version"
        return
    }
    
    Write-Status "Installing JFrog CLI..."
    
    # Create temp directory
    $tempDir = Join-Path $env:TEMP "jfrog-setup"
    if (!(Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir | Out-Null
    }
    
    try {
        # Download JFrog CLI
        $downloadUrl = "https://releases.jfrog.io/artifactory/jfrog-cli/v2/2.56.0/jfrog-cli-windows-amd64/jfrog.exe"
        $jfrogExePath = Join-Path $tempDir "jfrog.exe"
        
        Write-Status "Downloading JFrog CLI from $downloadUrl"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $jfrogExePath
        
        # Move to Program Files
        $installDir = "${env:ProgramFiles}\JFrog CLI"
        if (!(Test-Path $installDir)) {
            New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        }
        
        $finalPath = Join-Path $installDir "jfrog.exe"
        Copy-Item $jfrogExePath $finalPath -Force
        
        # Add to PATH if not already there
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::Machine)
        if ($currentPath -notlike "*$installDir*") {
            Write-Status "Adding JFrog CLI to system PATH..."
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installDir", [EnvironmentVariableTarget]::Machine)
            $env:PATH += ";$installDir"
        }
        
        Write-Status "JFrog CLI installed successfully to $finalPath"
    }
    catch {
        Write-Error "Failed to install JFrog CLI: $($_.Exception.Message)"
        throw
    }
    finally {
        # Cleanup
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# Configure Docker Desktop for insecure registry
function Configure-DockerDesktop {
    Write-Status "Configuring Docker Desktop for JFrog registry..."
    
    # Check if Docker is installed
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        throw "Docker not found"
    }
    
    Write-Warning "Docker Desktop configuration must be done manually on Windows:"
    Write-Host "1. Open Docker Desktop" -ForegroundColor Cyan
    Write-Host "2. Go to Settings > Docker Engine" -ForegroundColor Cyan
    Write-Host "3. Add the following to the JSON configuration:" -ForegroundColor Cyan
    Write-Host @"
{
  "insecure-registries": ["$DockerRegistry"],
  "registry-mirrors": []
}
"@ -ForegroundColor Gray
    Write-Host "4. Click 'Apply & Restart'" -ForegroundColor Cyan
    
    $continue = Read-Host "`nPress Enter after configuring Docker Desktop, or 'skip' to continue without Docker config"
    if ($continue.ToLower() -eq "skip") {
        Write-Warning "Skipping Docker configuration"
        return
    }
    
    # Test Docker
    try {
        $dockerInfo = & docker info 2>&1
        Write-Status "Docker is running"
    }
    catch {
        Write-Warning "Docker may not be configured correctly: $($_.Exception.Message)"
    }
}

# Configure JFrog CLI
function Configure-JFrogCLI {
    Write-Status "Configuring JFrog CLI..."
    
    # Check if configuration already exists
    try {
        $configOutput = & jfrog config show 2>&1
        if ($configOutput -like "*$ServerId*") {
            Write-Warning "JFrog server configuration '$ServerId' already exists"
            $reconfigure = Read-Host "Do you want to reconfigure? (y/N)"
            if ($reconfigure.ToLower() -ne "y") {
                Write-Status "Skipping JFrog CLI configuration"
                return
            }
            
            # Remove existing configuration
            & jfrog config remove $ServerId --quiet 2>&1 | Out-Null
        }
    }
    catch {
        # Config doesn't exist, which is fine
    }
    
    # Get credentials
    Write-Host "`nPlease enter your JFrog Artifactory credentials:" -ForegroundColor Yellow
    $jfrogUser = Read-Host "Username (default: onlysaid-ci)"
    if ([string]::IsNullOrEmpty($jfrogUser)) {
        $jfrogUser = "onlysaid-ci"
    }
    
    $jfrogPassword = Read-Host "Password" -AsSecureString
    $jfrogPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($jfrogPassword))
    
    if ([string]::IsNullOrEmpty($jfrogPasswordPlain)) {
        Write-Error "Password cannot be empty"
        throw "Empty password"
    }
    
    # Configure JFrog CLI
    Write-Status "Adding JFrog server configuration..."
    $artifactoryUrl = "$JFrogUrl/artifactory"
    
    try {
        & jfrog config add $ServerId --artifactory-url=$artifactoryUrl --user=$jfrogUser --password=$jfrogPasswordPlain --interactive=false
        
        # Test connection
        Write-Status "Testing JFrog connection..."
        $pingResult = & jfrog rt ping --server-id=$ServerId 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Status "JFrog connection successful"
        } else {
            Write-Error "Failed to connect to JFrog Artifactory: $pingResult"
            throw "Connection failed"
        }
        
        # Set as default
        & jfrog config use $ServerId
        Write-Status "Set '$ServerId' as default JFrog server"
    }
    catch {
        Write-Error "Failed to configure JFrog CLI: $($_.Exception.Message)"
        throw
    }
}

# Test Docker registry access
function Test-DockerRegistry {
    Write-Status "Testing Docker registry access..."
    
    # Get JFrog configuration
    try {
        $configOutput = & jfrog config show 2>&1
        $userMatch = $configOutput | Select-String "User:\s+(.+)"
        
        if ($userMatch) {
            $jfrogUser = $userMatch.Matches[0].Groups[1].Value.Trim()
            Write-Status "Testing Docker login for user: $jfrogUser"
            
            # Test Docker login
            Write-Host "Please enter your JFrog password for Docker login:"
            $dockerLogin = & docker login $DockerRegistry --username $jfrogUser 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Status "Docker login successful"
                
                # Test with a simple operation
                Write-Status "Testing Docker registry connectivity..."
                try {
                    & docker pull alpine:latest 2>&1 | Out-Null
                    $testTag = "$DockerRegistry/oa-onlysaid-app-docker-dev-local/test:latest"
                    & docker tag alpine:latest $testTag 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Status "Docker registry test successful"
                        & docker rmi $testTag 2>&1 | Out-Null
                    } else {
                        Write-Warning "Docker registry test failed, but basic login worked"
                    }
                }
                catch {
                    Write-Warning "Docker registry test encountered issues: $($_.Exception.Message)"
                }
            } else {
                Write-Warning "Docker login failed: $dockerLogin"
            }
        } else {
            Write-Warning "Could not extract username from JFrog configuration"
        }
    }
    catch {
        Write-Warning "JFrog CLI not configured properly. Skipping Docker registry test."
    }
}

# Create environment file template
function New-EnvironmentTemplate {
    Write-Status "Creating environment variables template..."
    
    $envFile = ".env.jfrog"
    $envContent = @"
# JFrog Artifactory Configuration
# Copy these values to your CI/CD environment variables

# Basic Configuration
JFROG_URL=$JFrogUrl
JFROG_USER=onlysaid-ci
JFROG_USER_PASSWORD=[your-password]
JFROG_SERVER_ID=$ServerId

# Docker Registry
DOCKER_REGISTRY_HOST=$DockerRegistry
DOCKER_REGISTRY=$DockerRegistry/oa-onlysaid-app-docker-dev-local

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
"@
    
    Set-Content -Path $envFile -Value $envContent
    Write-Status "Environment template created: $envFile"
    Write-Warning "Remember to update your CI/CD environment variables!"
}

# Display summary
function Show-Summary {
    Write-Header "Setup Summary"
    Write-Host "JFrog URL: " -NoNewline
    Write-Host $JFrogUrl -ForegroundColor Blue
    Write-Host "Docker Registry: " -NoNewline
    Write-Host $DockerRegistry -ForegroundColor Blue
    Write-Host "Server ID: " -NoNewline
    Write-Host $ServerId -ForegroundColor Blue
    
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Update your CI/CD environment variables (see .env.jfrog)"
    Write-Host "2. Create repositories in JFrog Artifactory:"
    Write-Host "   - oa-onlysaid-app-docker-dev-local (Docker)"
    Write-Host "   - oa-onlysaid-electron-dev-local (Generic)"
    Write-Host "   - oa-onlysaid-helm-local (Helm)"
    Write-Host "3. Configure permissions for the onlysaid-ci user"
    Write-Host "4. Test the CI/CD pipeline"
    
    Write-Status "Setup completed successfully!"
}

# Main execution
function Main {
    try {
        # Check administrator privileges for installation
        if (!(Test-Administrator)) {
            Write-Warning "Running without administrator privileges. Some operations may fail."
            $continue = Read-Host "Continue anyway? (y/N)"
            if ($continue.ToLower() -ne "y") {
                Write-Status "Please run as Administrator for full functionality"
                exit 1
            }
        }
        
        Install-JFrogCLI
        Configure-DockerDesktop
        Configure-JFrogCLI
        Test-DockerRegistry
        New-EnvironmentTemplate
        Show-Summary
    }
    catch {
        Write-Error "Setup failed: $($_.Exception.Message)"
        Write-Host "Please check the error above and try again." -ForegroundColor Red
        exit 1
    }
}

# Handle script interruption
trap {
    Write-Error "Setup interrupted"
    exit 1
}

# Run main function
Main 