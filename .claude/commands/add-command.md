---
name: add-command
description: /add-command — Scaffold a new Discord slash command
---

# Add Command

Scaffold a new slash command file with the correct boilerplate.

## Usage
`/add-command <category> <name> [description]`

## Steps
1. Create `src/commands/<category>/<name>.ts` using the Command template
2. Set the command name and description
3. Verify it compiles: `pnpm exec tsc --noEmit`
4. Remind user to run `pnpm deploy-commands` to register with Discord
