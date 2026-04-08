# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ToKa is a Discord bot built with TypeScript and discord.js v14, featuring AI chat powered by Google Gemini 2.0 Flash and admin-managed channel restrictions. Data is stored in PostgreSQL via Prisma ORM.

## Commands

```bash
pnpm run dev              # Run bot locally with tsx (hot reload)
pnpm run build            # Compile TypeScript to dist/
pnpm start                # Run compiled bot from dist/
pnpm run deploy-commands  # Register slash commands with Discord API
pnpm run db:push          # Push schema to DB without migrations (dev)
pnpm run db:migrate       # Run Prisma migrations
pnpm run db:generate      # Regenerate Prisma Client
pnpm exec tsc --noEmit    # Type-check without emitting
```

Docker: `docker-compose up -d` (starts bot + PostgreSQL 17).

## Architecture

**Plugin/handler system** — commands and events are auto-discovered from the filesystem at startup. Adding a new command = creating a new file in `src/commands/<category>/`. No manual wiring needed.

- `src/handlers/commandHandler.ts` scans `src/commands/` recursively, imports each file, validates it has `data` + `execute`, and registers all commands with Discord's API globally.
- `src/handlers/eventHandler.ts` scans `src/events/`, registers listeners using `once` or `on` based on the event's `once` property.
- `src/events/interactionCreate.ts` is the central router: handles channel restriction enforcement and per-user cooldowns before dispatching to the command's `execute()`.

**Key types** (`src/types/index.ts`):
- `Command` — must export `data` (SlashCommandBuilder) and `execute`. Optional `cooldown` (seconds).
- `ExtendedClient` — discord.js Client extended with `commands` and `cooldowns` Collections.

**Services** (`src/services/`):
- `gemini.ts` — wraps `@google/genai`. Manages per-user/per-guild conversation history in DB, capped at 20 messages. Uses `ai.models.generateContent()` with full history array each call.
- `settings.ts` — CRUD for channel restrictions. If no restrictions exist for a command, it works everywhere.
- `database.ts` — Prisma client singleton.

**Prisma 7 note**: Database URL is configured in `prisma.config.ts`, NOT in `prisma/schema.prisma`. The schema `datasource` block has no `url` field — this is a Prisma 7 requirement.

## Adding a New Command

Create a file in `src/commands/<category>/commandname.ts`:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("commandname")
    .setDescription("Description"),
  cooldown: 3, // optional, seconds
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Response");
  },
};

export default command;
```

The handler picks it up automatically on next restart. Run `pnpm run deploy-commands` to register with Discord.
