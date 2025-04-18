# onlysaid

## Features
- Complete any tasks with your team with only natural language
- All-in-one MCP stack with highly configurable and extensible client & servers
- Intelligent planning and execution system with full natural-langugage support
- Support multiple languages, Chinese, English, Japanese, Korean, and more to come

## Setup

Environment setting:

```bash
cp config/.env.template .env

# in .env
OPENAI_API_KEY=<YOUR-API-Key>
OPENAI_API_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
```

```bash
docker compose up

docker exec -it onlysaid-ollama bash
ollama pull nomic-embed-text

```

Visit `onlysaid.com` to open the web application.
