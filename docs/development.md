# Development Guide

This section contains documentation for developers working on the Onlysaid project, including setup instructions for CI/CD pipelines, Docker publishing, and deployment processes.

## Quick Links

- **[CI/CD Setup](development/ci-cd.md)** - Configure GitHub Actions workflows
- **[Docker Publishing](development/docker-publishing.md)** - Publish Docker images to JFrog Artifactory
- **[JFrog Configuration](development/jfrog-setup.md)** - Set up JFrog Artifactory for artifact management

## Prerequisites

Before working with the development workflows, ensure you have:

- Access to the self-hosted GitHub Actions runner
- JFrog Artifactory credentials and access
- Docker installed and configured
- Node.js 20+ for building applications

## Architecture Overview

The Onlysaid project consists of several components:

- **Next.js Web Application** - Main web interface
- **Electron Desktop Application** - Cross-platform desktop client
- **Socket Server** - Real-time communication server
- **Knowledge Base** - AI knowledge management system
- **Documentation** - Docsify-based documentation site

All components are built and published through automated CI/CD pipelines to JFrog Artifactory. 