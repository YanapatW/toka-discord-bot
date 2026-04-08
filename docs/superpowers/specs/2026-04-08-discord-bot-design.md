# ToKa Discord Bot — Phase 1 Design Spec

## Overview

**ToKa** is a multi-purpose Discord bot built with TypeScript and discord.js v14, using a plugin/handler architecture. Phase 1 covers the bot foundation and AI chat powered by Google Gemini 2.0 Flash (free tier).

Future phases will add moderation (Phase 2), utility (Phase 3), and fun/entertainment (Phase 4) features.

## Tech Stack

| Component        | Choice                          |
|------------------|---------------------------------|
| Runtime          | Node.js 24+                     |
| Language         | TypeScript 6                    |
| Discord library  | discord.js v14                  |
| AI provider      | Google Gemini 2.0 Flash         |
| Database         | PostgreSQL 17                   |
| ORM              | Prisma                          |
| Containerization | Docker + docker-compose         |
| Package manager  | pnpm                            |
| Hosting          | Oracle Cloud Free Tier (1 ARM VM) |

## Architecture

### Plugin/Handler System

The bot uses a dynamic handler system that auto-discovers commands and events from the filesystem. Adding a new command means creating a new file — no manual wiring required.

**Command interface:**

```ts
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  allowedChannels?: string[]; // optional hardcoded fallback
}
```

**How it works:**

1. On startup, `commandHandler.ts` recursively scans `src/commands/` for all `.ts` files
2. Each file is imported and validated (must export `data` and `execute`)
3. All commands are collected into a `Map<string, Command>`
4. Commands are registered with Discord's API (guild-based during dev, global for production)
5. When `interactionCreate` fires, it looks up the command name in the map and calls `execute()`

**Event handler** follows the same pattern — scans `src/events/` and registers listeners automatically.

### Interaction Style

All commands use Discord slash commands (no prefix commands). This is the modern Discord standard.

## Project Structure

```
bot/
├── src/
│   ├── index.ts                    # Entry point — initializes client, loads handlers
│   ├── config.ts                   # Environment variables & bot config
│   ├── handlers/
│   │   ├── commandHandler.ts       # Auto-discovers & registers slash commands
│   │   └── eventHandler.ts         # Auto-discovers & registers event listeners
│   ├── commands/
│   │   ├── ai/
│   │   │   ├── chat.ts             # /chat <message> — talk to Gemini
│   │   │   └── reset.ts            # /reset — clear conversation history
│   │   ├── admin/
│   │   │   ├── setchannel.ts       # /setchannel — allow command in a channel
│   │   │   ├── removechannel.ts    # /removechannel — remove channel restriction
│   │   │   └── listchannels.ts     # /listchannels — show channel restrictions
│   │   └── general/
│   │       ├── ping.ts             # /ping — health check
│   │       └── help.ts             # /help — list available commands
│   ├── events/
│   │   ├── ready.ts                # Bot online confirmation
│   │   └── interactionCreate.ts    # Routes slash commands
│   ├── services/
│   │   ├── gemini.ts               # Gemini API wrapper
│   │   ├── settings.ts             # Channel restriction logic (reads from DB)
│   │   └── database.ts             # Prisma client singleton
│   └── types/
│       └── command.ts              # Command interface definition
├── prisma/
│   └── schema.prisma               # Database schema
├── data/                            # Runtime data (if needed)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Database Schema

### channel_restrictions

Stores admin-configured channel restrictions for commands.

| Column     | Type    | Description                  |
|------------|---------|------------------------------|
| id         | Int (PK)| Auto-increment               |
| guild_id   | String  | Discord server ID            |
| command    | String  | Command name (e.g., "chat")  |
| channel_id | String  | Allowed channel ID           |
| created_at | DateTime| When the restriction was added|

Unique constraint on `(guild_id, command, channel_id)`.

If no restrictions exist for a command in a guild, it works in all channels (unrestricted by default).

### conversation_history

Stores per-user AI conversation history for context continuity.

| Column     | Type    | Description                  |
|------------|---------|------------------------------|
| id         | Int (PK)| Auto-increment               |
| user_id    | String  | Discord user ID              |
| guild_id   | String  | Discord server ID            |
| role       | String  | "user" or "model"            |
| content    | String  | Message text                 |
| created_at | DateTime| When the message was sent    |

History is capped at 20 messages per user per guild. Older messages are deleted when the cap is exceeded.

## Phase 1 Commands

### AI Commands

**`/chat <message>`**
- Sends user message to Gemini 2.0 Flash with conversation history
- Gemini responds with context from previous messages
- Response is posted in the channel
- 5-second per-user cooldown to respect Gemini rate limits (15 RPM)
- History capped at 20 messages per user, persisted in PostgreSQL

**`/reset`**
- Clears the user's conversation history in the current server
- Confirms with an ephemeral message

### Admin Commands

All require Administrator permission.

**`/setchannel command:<name> channel:<#channel>`**
- Restricts a command to a specific channel
- Multiple channels can be added per command

**`/removechannel command:<name> channel:<#channel>`**
- Removes a channel restriction

**`/listchannels command:<name>`**
- Shows all channel restrictions for a command

### General Commands

**`/ping`**
- Returns bot latency (WebSocket ping)

**`/help`**
- Lists all available commands with descriptions

## AI Chat Design

### Gemini Service

- Uses `@google/generative-ai` npm package
- Model: `gemini-2.0-flash`
- System prompt: configurable bot personality (default: "You are ToKa, a helpful and friendly Discord bot assistant")
- Handles API errors gracefully with user-friendly messages
- Rate limit: 5-second cooldown per user

### Conversation Memory

- Per-user, per-guild conversation threads
- Stored in PostgreSQL `conversation_history` table
- Capped at 20 messages (10 user + 10 model) per user per guild
- `/reset` clears history for the requesting user
- Conversation context sent to Gemini with each request

## Channel Restriction System

### How it works

1. Admin runs `/setchannel command:chat channel:#ai-chat`
2. Restriction is saved to `channel_restrictions` table
3. When `/chat` is used, the handler checks if restrictions exist for that command + guild
4. If restrictions exist and the current channel is not in the list, reply with ephemeral message: "This command can only be used in #ai-chat"
5. If no restrictions exist for a command, it works everywhere

### Enforcement

Channel restriction checking happens in `interactionCreate.ts` before the command's `execute()` is called. This is centralized — individual commands don't need to check.

## Environment Variables

```env
# Discord Bot
DISCORD_TOKEN=           # From Discord Developer Portal
DISCORD_CLIENT_ID=       # From Discord Developer Portal → OAuth2

# Gemini AI
GEMINI_API_KEY=          # From Google AI Studio

# PostgreSQL
POSTGRES_USER=           # Your choice
POSTGRES_PASSWORD=       # Your choice (use a strong password)
POSTGRES_DB=             # Your choice (e.g., discordbot)
DATABASE_URL=            # postgresql://USER:PASSWORD@db:5432/DBNAME
```

### How to obtain secrets

| Secret            | Source                                                                 |
|-------------------|------------------------------------------------------------------------|
| DISCORD_TOKEN     | Discord Developer Portal → New Application → Bot → Reset Token        |
| DISCORD_CLIENT_ID | Discord Developer Portal → OAuth2 → Copy Client ID                    |
| GEMINI_API_KEY    | Google AI Studio (aistudio.google.com) → Get API Key                  |
| POSTGRES_*        | You choose these values yourself                                       |

## Docker Setup

### docker-compose.yml

Two services:

- **bot** — builds from Dockerfile, connects to db, restarts unless stopped
- **db** — PostgreSQL 17 Alpine, persistent volume, healthcheck

Bot depends on db being healthy before starting.

### Dockerfile

Multi-stage build:
1. **Build stage** — install deps, compile TypeScript, generate Prisma client
2. **Run stage** — copy compiled JS + node_modules, run with Node.js

### Deployment (Oracle Cloud Free Tier)

**VM specs:** ARM Ampere A1, up to 4 OCPUs + 24GB RAM (free forever)

**Setup steps:**
1. Create Oracle Cloud account (credit card for verification only)
2. Create ARM A1 instance with Ubuntu 22.04
3. SSH in, install Docker and docker-compose
4. Clone repo, create `.env` file with secrets
5. Run `docker-compose up -d`
6. Bot is online

**Updating:**
```bash
git pull && docker-compose up -d --build
```

## Phased Roadmap

| Phase   | Features                                              | Status  |
|---------|-------------------------------------------------------|---------|
| Phase 1 | Bot foundation, AI chat (Gemini), channel restrictions | Current |
| Phase 2 | Moderation — kick, ban, warn, auto-mod, logging       | Planned |
| Phase 3 | Utility — polls, roles, reminders, server info        | Planned |
| Phase 4 | Fun — mini-games, economy, music, memes               | Planned |

Each phase follows its own design → plan → implementation cycle. The plugin/handler architecture ensures new features are added by dropping command files into the appropriate folder.

## Error Handling

- Gemini API failures: reply with "AI is temporarily unavailable, please try again later"
- Rate limit exceeded: reply with ephemeral message showing cooldown remaining
- Database connection lost: bot logs error, commands that need DB reply with error message
- Invalid permissions: ephemeral "You need Administrator permission to use this command"
- Unknown command errors: caught in interactionCreate, logged, user gets generic error message
