---
name: security
description: Security rules for bot development
---

# Security Rules

## Secrets
- Never hardcode tokens, API keys, or passwords
- All secrets via environment variables (validated in `src/config.ts`)
- `.env` is gitignored — only `.env.example` is committed
- Secrets are managed in Jenkins, not in the project

## User Input
- Slash command options are type-safe (Discord validates types)
- Still sanitize string inputs before using in embeds or messages
- Never use user input in raw SQL (use Prisma parameterized queries)
- Validate command names in admin commands (prevent injection via `/setchannel`)

## Discord
- Bot token must never appear in logs or error messages
- Use ephemeral messages for sensitive responses
- Validate guild membership before guild-specific operations

## Dependencies
- Pin major versions in package.json
- Review changelogs before major upgrades of discord.js or Prisma
