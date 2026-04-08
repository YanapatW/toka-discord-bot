---
name: discord-patterns
description: discord.js v14 patterns and requirements
---

# Discord Patterns

## Interaction Response Rules
- Must respond within 3 seconds or use `deferReply()`
- Can only `reply()` once — use `followUp()` for additional messages
- After `deferReply()`, use `editReply()` (not `reply()`)
- Check `interaction.replied || interaction.deferred` before error replies

## Ephemeral Messages
Use `MessageFlags.Ephemeral` for:
- Error messages
- Admin command responses
- Cooldown warnings
- Channel restriction notices

## Permissions
- Admin commands: `.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)`
- Channel restrictions: handled centrally in `interactionCreate.ts`
- Never check permissions manually in command files

## Cooldowns
- Set `cooldown` property on Command (seconds)
- Enforced in `interactionCreate.ts` — commands don't need to check
- Cooldown is per-user, stored in memory (Collection)

## Guild Context
- `interaction.guildId` may be null (DM context)
- Always handle DMs: use `interaction.guildId ?? "dm"` for DB operations
- Admin commands only work in guilds (Discord enforces this)

## Message Limits
- Discord messages: 2000 characters max
- Embed descriptions: 4096 characters max
- Truncate long AI responses before sending
