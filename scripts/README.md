# OnlySaid JFrog Setup Scripts

This directory contains automated setup scripts for configuring JFrog Artifactory with the OnlySaid project.

## Available Scripts

### Windows (PowerShell)
- **`setup-jfrog.ps1`** - PowerShell script for Windows users

### Linux/macOS (Bash)
- **`setup-jfrog.sh`** - Bash script for Linux and macOS users

## Usage

### Windows

1. **Run as Administrator** (recommended):
   ```powershell
   # Right-click PowerShell and select "Run as Administrator"
   .\scripts\setup-jfrog.ps1
   ```

2. **Or run without admin privileges** (some features may be limited):
   ```powershell
   .\scripts\setup-jfrog.ps1
   ```

3. **With custom parameters**:
   ```powershell
   .\scripts\setup-jfrog.ps1 -JFrogUrl "http://your-jfrog-url:8080" -ServerId "custom-server"
   ```

### Linux/macOS

1. **Make script executable**:
   ```bash
   chmod +x scripts/setup-jfrog.sh
   ```

2. **Run the script**:
   ```bash
   ./scripts/setup-jfrog.sh
   ```

## What the Scripts Do

1. **Install JFrog CLI**
   - Downloads and installs the latest JFrog CLI
   - Adds JFrog CLI to system PATH

2. **Configure Docker**
   - Sets up Docker to work with JFrog's insecure registry (HTTP)
   - On Windows: Provides manual instructions for Docker Desktop
   - On Linux: Automatically configures Docker daemon

3. **Configure JFrog CLI**
   - Prompts for JFrog credentials
   - Configures connection to your JFrog Artifactory instance
   - Tests the connection

4. **Test Setup**
   - Tests Docker registry login
   - Verifies basic Docker operations with JFrog registry

5. **Generate Environment Template**
   - Creates `.env.jfrog` file with environment variables
   - Ready to copy to your CI/CD configuration

## Prerequisites

### All Platforms
- JFrog Artifactory access credentials
- Internet connection for downloading JFrog CLI

### Windows
- PowerShell 5.1 or later
- Docker Desktop (for Docker registry functionality)
- Administrator privileges (recommended)

### Linux/macOS
- Bash shell
- Docker installed and running
- sudo access (for Docker configuration)
- curl (for downloading JFrog CLI)

## Configuration

The scripts use these default values:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| JFrog URL | `http://1bucket.oneas1a.com:8080` | Your JFrog Artifactory URL |
| Server ID | `onlysaid-server` | JFrog CLI server configuration name |
| Docker Registry | `1bucket.oneas1a.com:8080` | Docker registry hostname |

You can customize these values by editing the scripts or passing parameters.

## Output Files

After running the scripts, you'll find:

- **`.env.jfrog`** - Environment variables template for CI/CD
- **JFrog CLI configuration** - Stored in user's home directory
- **Docker configuration** - Updated daemon.json (Linux) or manual instructions (Windows)

## Troubleshooting

### Common Issues

1. **JFrog CLI Download Fails**
   - Check internet connection
   - Verify firewall settings
   - Try manual download from [JFrog CLI releases](https://releases.jfrog.io/artifactory/jfrog-cli/v2/)

2. **Docker Configuration Issues**
   - Ensure Docker is installed and running
   - Check Docker daemon status: `docker info`
   - Verify insecure registry configuration

3. **Permission Errors (Linux)**
   - Run script with sudo: `sudo ./scripts/setup-jfrog.sh`
   - Check Docker permissions: `sudo usermod -aG docker $USER`

4. **JFrog Connection Fails**
   - Verify JFrog URL is accessible
   - Check username and password
   - Confirm network connectivity: `curl -I http://1bucket.oneas1a.com:8080`

### Getting Help

For more detailed configuration instructions, see:
- [JFrog Setup Documentation](../docs/development/jfrog-setup.md)
- [CI/CD Configuration Guide](../docs/development/ci-cd.md)

## Security Notes

- Scripts will prompt for passwords - never hardcode credentials
- Use access tokens instead of passwords in production
- Review generated `.env.jfrog` file before committing to version control
- Consider using CI/CD secret management for sensitive values

## Manual Setup

If the automated scripts don't work for your environment, follow the manual setup guide in `docs/development/jfrog-setup.md`. 