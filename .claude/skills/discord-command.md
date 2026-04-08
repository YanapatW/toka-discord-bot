---
name: discord-command
description: How to create a new Discord slash command in the ToKa bot
---

# Creating a Discord Command

## File Location
`src/commands/<category>/commandname.ts`

Categories: `general/`, `ai/`, `admin/` (create new categories as needed)

## Template

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("commandname")
    .setDescription("What this command does"),

  cooldown: 3, // optional, seconds per user

  async execute(interaction: ChatInputCommandInteraction) {
    // For quick responses (< 3 seconds):
    await interaction.reply("Response");

    // For slow operations (API calls, DB queries):
    // await interaction.deferReply();
    // const result = await someService();
    // await interaction.editReply(result);

    // For private responses:
    // await interaction.reply({ content: "Private", flags: MessageFlags.Ephemeral });
  },
};

export default command;
```

## Admin Commands
Add `.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)` to the builder.

## After Creating
1. The handler auto-discovers it on restart (`pnpm dev`)
2. Run `pnpm deploy-commands` to register with Discord API
3. Slash command appears in Discord within minutes

## Key Rules
- Always `deferReply()` before any operation > 3 seconds
- Use `MessageFlags.Ephemeral` for error messages and admin responses
- Business logic belongs in `src/services/`, not in the command file
- Check `interaction.guildId` before using guild-specific features (may be null in DMs)
