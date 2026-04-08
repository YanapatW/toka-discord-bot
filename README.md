# ToKa Discord Bot

A multi-purpose Discord bot built with TypeScript and discord.js v14, featuring AI chat powered by Google Gemini and admin-managed channel restrictions.

## Tech Stack

- **Runtime:** Node.js 24+, TypeScript 6
- **Discord:** discord.js v14
- **AI:** Google Gemini (`@google/genai`)
- **Database:** PostgreSQL 17, Prisma 7 ORM
- **Infrastructure:** Docker, pnpm

## Features

**AI Chat**
- `/chat` — Talk to the AI via slash command
- `@ToKa` — Mention the bot in any channel for a conversation
- `/reset` — Clear your conversation history
- Per-user conversation history (20 message cap)

**Admin**
- `/setchannel` — Restrict a command to specific channels
- `/removechannel` — Remove a channel restriction
- `/listchannels` — View active restrictions

**General**
- `/ping` — Check bot latency
- `/help` — List all available commands

## Setup

### Prerequisites

- Node.js 24+
- pnpm
- Docker (for PostgreSQL, or use your own instance)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable | Where to get it |
|---|---|
| `DISCORD_TOKEN` | [Discord Developer Portal](https://discord.com/developers/applications) > Bot > Reset Token |
| `DISCORD_CLIENT_ID` | Same portal > OAuth2 > Client ID |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `POSTGRES_*` | Choose your own, or use the defaults for Docker |

### 3. Start the database

```bash
docker-compose up -d db
```

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Start the bot

```bash
pnpm dev
```

### Invite the bot

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## Docker (full stack)

Run both the bot and PostgreSQL:

```bash
docker-compose up -d --build
```

## Project Structure

```
src/
  commands/       # Slash commands (auto-discovered)
    admin/        # /setchannel, /removechannel, /listchannels
    ai/           # /chat, /reset
    general/      # /ping, /help
  events/         # Discord event handlers (auto-discovered)
  handlers/       # Command and event loaders
  services/       # Gemini AI, settings, database
  config.ts       # Environment validation
  types/          # TypeScript interfaces
prisma/
  schema.prisma   # Database schema
  migrations/     # Migration history
```

Commands and events are auto-discovered from the filesystem — add a new file and restart, no wiring needed.

## License

ISC
