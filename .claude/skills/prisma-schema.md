---
name: prisma-schema
description: How to modify the database schema in this project (Prisma 7)
---

# Prisma Schema Changes

## Important: Prisma 7
This project uses **Prisma 7**. The database URL is configured in `prisma.config.ts`, NOT in `prisma/schema.prisma`. The schema `datasource` block has no `url` field.

## Adding a New Model

1. Edit `prisma/schema.prisma`:
```prisma
model NewModel {
  id        Int      @id @default(autoincrement())
  guildId   String   @map("guild_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("new_models")
}
```

2. Regenerate client: `pnpm db:generate`
3. Push to DB (dev): `pnpm db:push`
4. Or create migration: `pnpm db:migrate`

## Conventions
- Model names: PascalCase (`ChannelRestriction`)
- Table names: snake_case via `@@map("channel_restrictions")`
- Column names: camelCase in code, snake_case in DB via `@map("column_name")`
- Always include `createdAt` with `@default(now())`
- Use `@@unique` for composite unique constraints

## Creating a Service
After adding a model, create a service in `src/services/` that wraps all DB operations for that model. Import the Prisma singleton from `./database.js`.
