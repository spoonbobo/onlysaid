# Getting Started

This guide will help you download and get started with the platform.

## Table of Contents

- [Download](#download)
- [Login](#login)
- [Setup Model API keys](#setup-model-api-keys)
- [Setup MCP Servers](#setup-mcp-servers)
- [Create a Workspace](#create-a-workspace)
- [Create a Knowledge Base for your Workspace](#create-a-knowledge-base-for-your-workspace)
- [Create a Chat in workspace](#create-a-chat-in-workspace)
- [Interface](#interface)

## Download

### Latest Release - v0.4.4

- <img src="https://www.svgrepo.com/show/355384/windows-legacy.svg" alt="Windows" height="20" /> **Windows:** [Onlysaid.Setup.0.4.4.exe](https://github.com/spoonbobo/onlysaid/releases/download/v0.4.4/Onlysaid.Setup.1.0.0.exe)

- <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Tux.svg/25px-Tux.svg.png" alt="Linux" height="20" /> **Linux:** [Onlysaid-0.4.4.AppImage](https://github.com/spoonbobo/onlysaid/releases/download/v0.4.4/Onlysaid-0.4.4.AppImage)
  - After downloading, make the AppImage executable: `chmod +x Onlysaid-0.4.4.AppImage`

## Login

> **Info**
> Onlysaid can be used offline or online. To access to mainstream services provided by Onlysaid, log in is required to access workspace services.

To log in, follow these steps:

1.  navigate to settings (read [here](#interface))
2.  navigate to user general settings.
3.  click login

## Setup Model API keys

> **Info**
> Model API keys are required to access LLM services. We currently support following API keys:
>
> - DeepSeek
> - Ollama
> - OpenAI (not tested yet)

To setup model API keys, follow these steps:

1. navigate to settings (read [here](#interface))
2. navigate to model API Keys
3. input, for example, deepeseek API key, and click `verify`
4. if verification is successful, enable to models to complete the setup

All your model API keys are kept private in your own device environment, meaning it won't be exposed to cloud or other parties.

## Setup MCP Servers

> **Info**
> Onlysaid continuously integrates with many open sourced MCP tools for you to customize your own agents.

> **Info**
> Depends on each MCP server, you are required to input required API keys/ other information to eneble them. For example, you need a [Tavily API key](https://tavily.com/) to enable web search with `tavily` MCP server.

As an example, to setup Tavily server, follow these steps:

1. navigate to settings
2. navigate to MCP servers in Tools section
3. search for `Tavily Web Search MCP Server` and click configure
4. once configured, enable to mcp server to complete the setup

Similar to Model API key, all data you input to enable MCP services are kept private and invisible to other.

## Create a Workspace

> **Info**
> Workspace is an environment where you collaborate with others from small discussions to finishing complex tasks. It provides an environment for teams to schedule and work on all kind of tasks.

To create a workspace, follow these steps:

1. click `+` button (create workspace) in sidebar (read [here](#interface))
2. select a name for the workspace
3. click create

## Create a Knowledge Base for your Workspace

> **Info**
> Onlysaid allows users to query private or public knowledge bases. All knowledge bases created in workspaces are considered `public` and hosted on dedicated storage on Cloud where only members of your workspace can access.

Video walkthrough:

<div align="center">
  <iframe src="https://drive.google.com/file/d/1CX4mTbW7ZTXoBbWjoEj0eeQk1o_Z8odH/preview" 
          width="640" 
          height="360" 
          frameborder="0" 
          allowfullscreen="true">
  </iframe>
</div>

## Create a Chat in workspace

Video walkthrough:

<div align="center">
  <iframe src="https://drive.google.com/file/d/1CX4mTbW7ZTXoBbWjoEj0eeQk1o_Z8odH/preview" 
          width="640" 
          height="360" 
          frameborder="0" 
          allowfullscreen="true">
  </iframe>
</div>

### Select AI mode in Chat

OnlySaid offers three AI interaction modes:

- **Ask Mode**: Direct conversational assistance with professional responses
- **Query Mode**: Knowledge base retrieval using selected databases and embedding models
- **Agent Mode**: Autonomous tool execution through MCP integrations

| Mode  | Use Cases                                          | Tool Access | Knowledge Base |
| ----- | -------------------------------------------------- | ----------- | -------------- |
| Ask   | General Q&A, conversational assistance             | No          | No             |
| Query | RAG-based knowledge base querying, document search | No          | Yes            |
| Agent | AI automated task execution, workflow automation   | Yes         | Optional       |

## Interface

![Interface](assets/interface/interface.png)
