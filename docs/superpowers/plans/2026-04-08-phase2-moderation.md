# Phase 2: Moderation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add moderation tools (kick/ban/warn), configurable warn escalation, per-server auto-mod, custom role permissions, and dual-category mod logging.

**Architecture:** New Prisma models (GuildConfig, Warning, BannedWord, CommandRole) for per-server settings. Two new services (moderation CRUD, mod log embeds). Auto-mod checks run in the existing messageCreate event before AI chat. Custom role permissions enforced in interactionCreate alongside channel restrictions.

**Tech Stack:** TypeScript, discord.js v14, Prisma 7, PostgreSQL

---

## File Map

### New files
- `prisma/migrations/<timestamp>_phase2_moderation/migration.sql` — DB migration
- `src/services/moderation.ts` — guild config, warnings, banned words, command roles CRUD
- `src/services/modlog.ts` — log embed helper
- `src/commands/moderation/kick.ts`
- `src/commands/moderation/ban.ts`
- `src/commands/moderation/unban.ts`
- `src/commands/moderation/warn.ts`
- `src/commands/moderation/warnings.ts`
- `src/commands/moderation/clearwarnings.ts`
- `src/commands/admin/automod.ts` — subcommands: set, config, status
- `src/commands/admin/bannedwords.ts` — subcommands: add, remove, list
- `src/commands/admin/warnconfig.ts` — subcommands: set, status, mute-duration
- `src/commands/admin/setlogchannel.ts`
- `src/commands/admin/removelogchannel.ts`
- `src/commands/admin/setrole.ts`
- `src/commands/admin/removerole.ts`
- `src/commands/admin/listroles.ts`

### Modified files
- `prisma/schema.prisma` — add 4 new models
- `src/events/messageCreate.ts` — add auto-mod checks before AI chat
- `src/events/interactionCreate.ts` — add custom role permission check

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>/migration.sql` (auto-generated)

- [ ] **Step 1: Add new models to schema**

Add these models at the end of `prisma/schema.prisma`:

```prisma
model GuildConfig {
  id        Int     @id @default(autoincrement())
  guildId   String  @unique @map("guild_id")

  modLogChannelId     String? @map("mod_log_channel_id")
  automodLogChannelId String? @map("automod_log_channel_id")

  automodBannedWords   Boolean @default(false) @map("automod_banned_words")
  automodSpam          Boolean @default(false) @map("automod_spam")
  automodLinks         Boolean @default(false) @map("automod_links")
  automodMassMentions  Boolean @default(false) @map("automod_mass_mentions")

  spamMaxMessages    Int @default(5)  @map("spam_max_messages")
  spamInterval       Int @default(10) @map("spam_interval")
  massMentionLimit   Int @default(5)  @map("mass_mention_limit")

  warnMuteThreshold  Int? @map("warn_mute_threshold")
  warnKickThreshold  Int? @map("warn_kick_threshold")
  warnBanThreshold   Int? @map("warn_ban_threshold")
  muteDuration       Int  @default(60) @map("mute_duration")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  @@map("guild_config")
}

model Warning {
  id          Int      @id @default(autoincrement())
  guildId     String   @map("guild_id")
  userId      String   @map("user_id")
  moderatorId String   @map("moderator_id")
  reason      String
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("warnings")
}

model BannedWord {
  id      Int    @id @default(autoincrement())
  guildId String @map("guild_id")
  word    String

  @@unique([guildId, word])
  @@map("banned_words")
}

model CommandRole {
  id      Int    @id @default(autoincrement())
  guildId String @map("guild_id")
  command String
  roleId  String @map("role_id")

  @@unique([guildId, command, roleId])
  @@map("command_roles")
}
```

- [ ] **Step 2: Generate migration**

Run: `pnpm exec prisma migrate dev --name phase2_moderation`
Expected: migration created and applied, Prisma client regenerated

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Phase 2 database schema (guild config, warnings, banned words, command roles)"
```

---

### Task 2: Moderation Service

**Files:**
- Create: `src/services/moderation.ts`

- [ ] **Step 1: Create the service file**

```typescript
import prisma from "./database.js";

// --- Guild Config ---

export async function getGuildConfig(guildId: string) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function updateGuildConfig(
  guildId: string,
  data: Parameters<typeof prisma.guildConfig.update>[0]["data"]
) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });
}

// --- Warnings ---

export async function addWarning(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string
) {
  await prisma.warning.create({
    data: { guildId, userId, moderatorId, reason },
  });
  return prisma.warning.count({ where: { guildId, userId } });
}

export async function getWarnings(guildId: string, userId: string) {
  return prisma.warning.findMany({
    where: { guildId, userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function clearWarnings(guildId: string, userId: string) {
  const result = await prisma.warning.deleteMany({
    where: { guildId, userId },
  });
  return result.count;
}

export async function countWarnings(guildId: string, userId: string) {
  return prisma.warning.count({ where: { guildId, userId } });
}

// --- Banned Words ---

export async function addBannedWord(
  guildId: string,
  word: string
): Promise<boolean> {
  try {
    await prisma.bannedWord.create({
      data: { guildId, word: word.toLowerCase() },
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeBannedWord(
  guildId: string,
  word: string
): Promise<boolean> {
  const result = await prisma.bannedWord.deleteMany({
    where: { guildId, word: word.toLowerCase() },
  });
  return result.count > 0;
}

export async function getBannedWords(guildId: string): Promise<string[]> {
  const words = await prisma.bannedWord.findMany({
    where: { guildId },
    select: { word: true },
  });
  return words.map((w) => w.word);
}

// --- Command Roles ---

export async function addCommandRole(
  guildId: string,
  command: string,
  roleId: string
): Promise<boolean> {
  try {
    await prisma.commandRole.create({
      data: { guildId, command, roleId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeCommandRole(
  guildId: string,
  command: string,
  roleId: string
): Promise<boolean> {
  const result = await prisma.commandRole.deleteMany({
    where: { guildId, command, roleId },
  });
  return result.count > 0;
}

export async function getCommandRoles(
  guildId: string,
  command: string
): Promise<string[]> {
  const roles = await prisma.commandRole.findMany({
    where: { guildId, command },
    select: { roleId: true },
  });
  return roles.map((r) => r.roleId);
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/services/moderation.ts
git commit -m "feat: add moderation service (guild config, warnings, banned words, command roles)"
```

---

### Task 3: Mod Log Service

**Files:**
- Create: `src/services/modlog.ts`

- [ ] **Step 1: Create the service file**

```typescript
import { EmbedBuilder, Guild, TextChannel } from "discord.js";
import { getGuildConfig } from "./moderation.js";

interface ModLogData {
  action: string;
  target: string;
  moderator?: string;
  reason: string;
  color: number;
  extraFields?: { name: string; value: string }[];
}

export async function logModAction(
  guild: Guild,
  type: "moderation" | "automod",
  data: ModLogData
): Promise<void> {
  const config = await getGuildConfig(guild.id);
  const channelId =
    type === "moderation" ? config.modLogChannelId : config.automodLogChannelId;

  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !(channel instanceof TextChannel)) return;

  const embed = new EmbedBuilder()
    .setTitle(data.action)
    .setColor(data.color)
    .addFields(
      { name: "Target", value: data.target, inline: true },
      { name: "Moderator", value: data.moderator ?? "Auto-mod", inline: true },
      { name: "Reason", value: data.reason }
    )
    .setTimestamp();

  if (data.extraFields) {
    embed.addFields(data.extraFields);
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send mod log to ${channelId}:`, error);
  }
}

// Color constants
export const ModLogColors = {
  BAN: 0xff0000,
  KICK: 0xff8c00,
  WARN: 0xffd700,
  AUTOMOD: 0x3498db,
  INFO: 0x2ecc71,
} as const;
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/services/modlog.ts
git commit -m "feat: add mod log service with embed formatting"
```

---

### Task 4: Role Permission Check in interactionCreate

**Files:**
- Modify: `src/events/interactionCreate.ts`

- [ ] **Step 1: Add role check after channel restriction check**

Add import at the top of `src/events/interactionCreate.ts`:

```typescript
import { getCommandRoles } from "../services/moderation.js";
```

Add this block after the channel restriction check (after line 33, before the cooldown check) in `src/events/interactionCreate.ts`:

```typescript
    // Custom role permission check (moderation commands only)
    if (interaction.guildId && interaction.member) {
      const allowedRoles = await getCommandRoles(
        interaction.guildId,
        interaction.commandName
      );

      if (allowedRoles.length > 0) {
        const memberRoles =
          interaction.member.roles instanceof Collection
            ? [...interaction.member.roles.cache.keys()]
            : (interaction.member.roles as string[]);

        const hasRole = allowedRoles.some((roleId) =>
          memberRoles.includes(roleId)
        );

        if (!hasRole) {
          await interaction.reply({
            content: "You don't have permission to use this command.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/events/interactionCreate.ts
git commit -m "feat: add custom role permission check in interaction handler"
```

---

### Task 5: Log Channel Commands

**Files:**
- Create: `src/commands/admin/setlogchannel.ts`
- Create: `src/commands/admin/removelogchannel.ts`

- [ ] **Step 1: Create setlogchannel.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { updateGuildConfig } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Set the log channel for a category")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Log category")
        .setRequired(true)
        .addChoices(
          { name: "moderation", value: "moderation" },
          { name: "automod", value: "automod" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send logs to")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString("type", true);
    const channel = interaction.options.getChannel("channel", true);

    const field =
      type === "moderation" ? "modLogChannelId" : "automodLogChannelId";

    await updateGuildConfig(interaction.guildId!, { [field]: channel.id });

    await interaction.reply({
      content: `${type} logs will now be sent to <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
```

- [ ] **Step 2: Create removelogchannel.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { updateGuildConfig } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("removelogchannel")
    .setDescription("Disable logging for a category")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Log category")
        .setRequired(true)
        .addChoices(
          { name: "moderation", value: "moderation" },
          { name: "automod", value: "automod" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString("type", true);
    const field =
      type === "moderation" ? "modLogChannelId" : "automodLogChannelId";

    await updateGuildConfig(interaction.guildId!, { [field]: null });

    await interaction.reply({
      content: `${type} logging has been disabled.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/admin/setlogchannel.ts src/commands/admin/removelogchannel.ts
git commit -m "feat: add /setlogchannel and /removelogchannel commands"
```

---

### Task 6: Role Config Commands

**Files:**
- Create: `src/commands/admin/setrole.ts`
- Create: `src/commands/admin/removerole.ts`
- Create: `src/commands/admin/listroles.ts`

- [ ] **Step 1: Create setrole.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { addCommandRole } from "../../services/moderation.js";

const MOD_COMMANDS = ["kick", "ban", "unban", "warn", "warnings", "clearwarnings"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setrole")
    .setDescription("Allow a role to use a moderation command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command to configure")
        .setRequired(true)
        .addChoices(...MOD_COMMANDS.map((c) => ({ name: `/${c}`, value: c })))
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to allow")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const role = interaction.options.getRole("role", true);

    const added = await addCommandRole(interaction.guildId!, commandName, role.id);

    if (added) {
      await interaction.reply({
        content: `<@&${role.id}> can now use \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `<@&${role.id}> already has access to \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 2: Create removerole.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { removeCommandRole } from "../../services/moderation.js";

const MOD_COMMANDS = ["kick", "ban", "unban", "warn", "warnings", "clearwarnings"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("Remove a role's access to a moderation command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command to configure")
        .setRequired(true)
        .addChoices(...MOD_COMMANDS.map((c) => ({ name: `/${c}`, value: c })))
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to remove")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const role = interaction.options.getRole("role", true);

    const removed = await removeCommandRole(interaction.guildId!, commandName, role.id);

    if (removed) {
      await interaction.reply({
        content: `<@&${role.id}> can no longer use \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `<@&${role.id}> didn't have access to \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 3: Create listroles.ts**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getCommandRoles } from "../../services/moderation.js";

const MOD_COMMANDS = ["kick", "ban", "unban", "warn", "warnings", "clearwarnings"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("listroles")
    .setDescription("Show role overrides for moderation commands")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command to check (leave empty for all)")
        .addChoices(...MOD_COMMANDS.map((c) => ({ name: `/${c}`, value: c })))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command");
    const commands = commandName ? [commandName] : MOD_COMMANDS;

    const embed = new EmbedBuilder()
      .setTitle("Role Overrides")
      .setColor(0x3498db);

    for (const cmd of commands) {
      const roleIds = await getCommandRoles(interaction.guildId!, cmd);
      const value =
        roleIds.length > 0
          ? roleIds.map((id) => `<@&${id}>`).join(", ")
          : "Default (Discord permissions)";
      embed.addFields({ name: `/${cmd}`, value });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/admin/setrole.ts src/commands/admin/removerole.ts src/commands/admin/listroles.ts
git commit -m "feat: add /setrole, /removerole, /listroles commands"
```

---

### Task 7: Moderation Commands — kick, ban, unban

**Files:**
- Create: `src/commands/moderation/kick.ts`
- Create: `src/commands/moderation/ban.ts`
- Create: `src/commands/moderation/unban.ts`

- [ ] **Step 1: Create kick.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to kick").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for kicking")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: "User not found in this server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "I cannot kick this user. They may have a higher role than me.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.kick(reason);

      await interaction.reply({
        content: `**${user.tag}** has been kicked. Reason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });

      await logModAction(interaction.guild!, "moderation", {
        action: "Member Kicked",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason,
        color: ModLogColors.KICK,
      });
    } catch (error) {
      console.error("Kick error:", error);
      await interaction.reply({
        content: "Failed to kick user.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 2: Create ban.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for banning")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      await interaction.reply({
        content: "I cannot ban this user. They may have a higher role than me.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.guild!.members.ban(user.id, { reason });

      await interaction.reply({
        content: `**${user.tag}** has been banned. Reason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });

      await logModAction(interaction.guild!, "moderation", {
        action: "Member Banned",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason,
        color: ModLogColors.BAN,
      });
    } catch (error) {
      console.error("Ban error:", error);
      await interaction.reply({
        content: "Failed to ban user.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 3: Create unban.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption((option) =>
      option
        .setName("user-id")
        .setDescription("User ID to unban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for unbanning")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString("user-id", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    try {
      const user = await interaction.client.users.fetch(userId);
      await interaction.guild!.members.unban(userId, reason);

      await interaction.reply({
        content: `**${user.tag}** has been unbanned. Reason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });

      await logModAction(interaction.guild!, "moderation", {
        action: "Member Unbanned",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason,
        color: ModLogColors.INFO,
      });
    } catch (error) {
      console.error("Unban error:", error);
      await interaction.reply({
        content: "Failed to unban user. Make sure the ID is correct and the user is banned.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/moderation/kick.ts src/commands/moderation/ban.ts src/commands/moderation/unban.ts
git commit -m "feat: add /kick, /ban, /unban moderation commands"
```

---

### Task 8: Warn Commands + Escalation

**Files:**
- Create: `src/commands/moderation/warn.ts`
- Create: `src/commands/moderation/warnings.ts`
- Create: `src/commands/moderation/clearwarnings.ts`

- [ ] **Step 1: Create warn.ts with escalation logic**

```typescript
import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { addWarning, getGuildConfig } from "../../services/moderation.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to warn").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for warning")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    const count = await addWarning(
      interaction.guildId!,
      user.id,
      interaction.user.id,
      reason
    );

    await interaction.reply({
      content: `**${user.tag}** has been warned. Reason: ${reason} (Total warnings: ${count})`,
      flags: MessageFlags.Ephemeral,
    });

    await logModAction(interaction.guild!, "moderation", {
      action: "Member Warned",
      target: `${user.tag} (${user.id})`,
      moderator: interaction.user.tag,
      reason,
      color: ModLogColors.WARN,
      extraFields: [{ name: "Total Warnings", value: String(count) }],
    });

    // Escalation check
    await checkEscalation(interaction, user.id, count);
  },
};

async function checkEscalation(
  interaction: ChatInputCommandInteraction,
  userId: string,
  count: number
) {
  const config = await getGuildConfig(interaction.guildId!);
  const member = await interaction.guild!.members.fetch(userId).catch(() => null);
  if (!member) return;

  let escalationAction: string | null = null;

  if (config.warnBanThreshold && count >= config.warnBanThreshold && member.bannable) {
    await member.ban({ reason: `Auto-escalation: ${count} warnings` });
    escalationAction = "Auto-Ban";
  } else if (config.warnKickThreshold && count >= config.warnKickThreshold && member.kickable) {
    await member.kick(`Auto-escalation: ${count} warnings`);
    escalationAction = "Auto-Kick";
  } else if (config.warnMuteThreshold && count >= config.warnMuteThreshold) {
    const duration = config.muteDuration * 60 * 1000;
    await member.timeout(duration, `Auto-escalation: ${count} warnings`);
    escalationAction = `Auto-Mute (${config.muteDuration}min)`;
  }

  if (escalationAction) {
    await interaction.followUp({
      content: `**${member.user.tag}** has been auto-escalated: **${escalationAction}** (${count} warnings)`,
      flags: MessageFlags.Ephemeral,
    });

    const color = escalationAction.includes("Ban")
      ? ModLogColors.BAN
      : escalationAction.includes("Kick")
        ? ModLogColors.KICK
        : ModLogColors.WARN;

    await logModAction(interaction.guild!, "moderation", {
      action: escalationAction,
      target: `${member.user.tag} (${member.user.id})`,
      moderator: "Auto-escalation",
      reason: `Reached ${count} warnings`,
      color,
    });
  }
}

export default command;
```

- [ ] **Step 2: Create warnings.ts**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getWarnings } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a member")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to check").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const warnings = await getWarnings(interaction.guildId!, user.id);

    if (warnings.length === 0) {
      await interaction.reply({
        content: `**${user.tag}** has no warnings.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.tag}`)
      .setColor(0xffd700)
      .setDescription(`Total: **${warnings.length}** warnings`);

    for (const warn of warnings.slice(0, 25)) {
      const mod = await interaction.client.users.fetch(warn.moderatorId).catch(() => null);
      embed.addFields({
        name: `#${warn.id} — ${warn.createdAt.toLocaleDateString()}`,
        value: `**Reason:** ${warn.reason}\n**By:** ${mod?.tag ?? warn.moderatorId}`,
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
```

- [ ] **Step 3: Create clearwarnings.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { clearWarnings } from "../../services/moderation.js";
import { logModAction, ModLogColors } from "../../services/modlog.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear all warnings for a member")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to clear").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const count = await clearWarnings(interaction.guildId!, user.id);

    await interaction.reply({
      content:
        count > 0
          ? `Cleared **${count}** warnings for **${user.tag}**.`
          : `**${user.tag}** has no warnings to clear.`,
      flags: MessageFlags.Ephemeral,
    });

    if (count > 0) {
      await logModAction(interaction.guild!, "moderation", {
        action: "Warnings Cleared",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason: `${count} warnings cleared`,
        color: ModLogColors.INFO,
      });
    }
  },
};

export default command;
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/moderation/warn.ts src/commands/moderation/warnings.ts src/commands/moderation/clearwarnings.ts
git commit -m "feat: add /warn, /warnings, /clearwarnings with escalation"
```

---

### Task 9: Warn Config Command

**Files:**
- Create: `src/commands/admin/warnconfig.ts`

- [ ] **Step 1: Create warnconfig.ts with subcommands**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getGuildConfig, updateGuildConfig } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnconfig")
    .setDescription("Configure warn escalation thresholds")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a warn threshold for an action")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action to trigger")
            .setRequired(true)
            .addChoices(
              { name: "mute", value: "mute" },
              { name: "kick", value: "kick" },
              { name: "ban", value: "ban" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("threshold")
            .setDescription("Number of warnings to trigger (0 to disable)")
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current warn thresholds")
    )
    .addSubcommand((sub) =>
      sub
        .setName("mute-duration")
        .setDescription("Set auto-mute duration")
        .addIntegerOption((option) =>
          option
            .setName("minutes")
            .setDescription("Duration in minutes")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const action = interaction.options.getString("action", true);
      const threshold = interaction.options.getInteger("threshold", true);
      const fieldMap: Record<string, string> = {
        mute: "warnMuteThreshold",
        kick: "warnKickThreshold",
        ban: "warnBanThreshold",
      };

      const value = threshold === 0 ? null : threshold;
      await updateGuildConfig(interaction.guildId!, { [fieldMap[action]]: value });

      await interaction.reply({
        content:
          value !== null
            ? `Auto-**${action}** will trigger at **${threshold}** warnings.`
            : `Auto-**${action}** has been disabled.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "status") {
      const config = await getGuildConfig(interaction.guildId!);
      const embed = new EmbedBuilder()
        .setTitle("Warn Escalation Config")
        .setColor(0xffd700)
        .addFields(
          { name: "Mute at", value: config.warnMuteThreshold?.toString() ?? "Disabled", inline: true },
          { name: "Kick at", value: config.warnKickThreshold?.toString() ?? "Disabled", inline: true },
          { name: "Ban at", value: config.warnBanThreshold?.toString() ?? "Disabled", inline: true },
          { name: "Mute Duration", value: `${config.muteDuration} minutes` }
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (sub === "mute-duration") {
      const minutes = interaction.options.getInteger("minutes", true);
      await updateGuildConfig(interaction.guildId!, { muteDuration: minutes });

      await interaction.reply({
        content: `Auto-mute duration set to **${minutes}** minutes.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/admin/warnconfig.ts
git commit -m "feat: add /warnconfig command with escalation thresholds"
```

---

### Task 10: Auto-mod Config + Banned Words Commands

**Files:**
- Create: `src/commands/admin/automod.ts`
- Create: `src/commands/admin/bannedwords.ts`

- [ ] **Step 1: Create automod.ts**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getGuildConfig, updateGuildConfig } from "../../services/moderation.js";

const FEATURE_MAP: Record<string, string> = {
  "banned-words": "automodBannedWords",
  spam: "automodSpam",
  links: "automodLinks",
  "mass-mentions": "automodMassMentions",
};

const SETTING_MAP: Record<string, string> = {
  "spam-max-messages": "spamMaxMessages",
  "spam-interval": "spamInterval",
  "mass-mention-limit": "massMentionLimit",
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure auto-moderation")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Toggle an auto-mod feature")
        .addStringOption((option) =>
          option
            .setName("feature")
            .setDescription("Feature to toggle")
            .setRequired(true)
            .addChoices(
              { name: "banned-words", value: "banned-words" },
              { name: "spam", value: "spam" },
              { name: "links", value: "links" },
              { name: "mass-mentions", value: "mass-mentions" }
            )
        )
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Enable or disable").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("config")
        .setDescription("Set an auto-mod threshold")
        .addStringOption((option) =>
          option
            .setName("setting")
            .setDescription("Setting to change")
            .setRequired(true)
            .addChoices(
              { name: "spam-max-messages", value: "spam-max-messages" },
              { name: "spam-interval", value: "spam-interval" },
              { name: "mass-mention-limit", value: "mass-mention-limit" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("New value")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show auto-mod status")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const feature = interaction.options.getString("feature", true);
      const enabled = interaction.options.getBoolean("enabled", true);
      const field = FEATURE_MAP[feature];

      await updateGuildConfig(interaction.guildId!, { [field]: enabled });

      await interaction.reply({
        content: `Auto-mod **${feature}** has been ${enabled ? "enabled" : "disabled"}.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "config") {
      const setting = interaction.options.getString("setting", true);
      const value = interaction.options.getInteger("value", true);
      const field = SETTING_MAP[setting];

      await updateGuildConfig(interaction.guildId!, { [field]: value });

      await interaction.reply({
        content: `**${setting}** set to **${value}**.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "status") {
      const config = await getGuildConfig(interaction.guildId!);
      const on = "On";
      const off = "Off";

      const embed = new EmbedBuilder()
        .setTitle("Auto-mod Status")
        .setColor(0x3498db)
        .addFields(
          { name: "Banned Words", value: config.automodBannedWords ? on : off, inline: true },
          { name: "Spam Detection", value: config.automodSpam ? on : off, inline: true },
          { name: "Link Filter", value: config.automodLinks ? on : off, inline: true },
          { name: "Mass Mentions", value: config.automodMassMentions ? on : off, inline: true },
          { name: "Spam Max Messages", value: String(config.spamMaxMessages), inline: true },
          { name: "Spam Interval", value: `${config.spamInterval}s`, inline: true },
          { name: "Mass Mention Limit", value: String(config.massMentionLimit), inline: true }
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};

export default command;
```

- [ ] **Step 2: Create bannedwords.ts**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import {
  addBannedWord,
  removeBannedWord,
  getBannedWords,
} from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bannedwords")
    .setDescription("Manage banned words for auto-mod")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a banned word")
        .addStringOption((option) =>
          option.setName("word").setDescription("Word or phrase to ban").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a banned word")
        .addStringOption((option) =>
          option.setName("word").setDescription("Word or phrase to remove").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all banned words")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const word = interaction.options.getString("word", true);
      const added = await addBannedWord(interaction.guildId!, word);

      await interaction.reply({
        content: added
          ? `**${word.toLowerCase()}** has been added to the banned words list.`
          : `**${word.toLowerCase()}** is already banned.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "remove") {
      const word = interaction.options.getString("word", true);
      const removed = await removeBannedWord(interaction.guildId!, word);

      await interaction.reply({
        content: removed
          ? `**${word.toLowerCase()}** has been removed from the banned words list.`
          : `**${word.toLowerCase()}** was not in the banned words list.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "list") {
      const words = await getBannedWords(interaction.guildId!);

      await interaction.reply({
        content:
          words.length > 0
            ? `**Banned words:** ${words.map((w) => `\`${w}\``).join(", ")}`
            : "No banned words configured.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/admin/automod.ts src/commands/admin/bannedwords.ts
git commit -m "feat: add /automod and /bannedwords config commands"
```

---

### Task 11: Auto-mod in messageCreate

**Files:**
- Modify: `src/events/messageCreate.ts`

- [ ] **Step 1: Rewrite messageCreate.ts with auto-mod checks**

Replace the full content of `src/events/messageCreate.ts`:

```typescript
import { Events, Message, PermissionFlagsBits } from "discord.js";
import { Event } from "../types/index.js";
import { chat } from "../services/gemini.js";
import { getGuildConfig, getBannedWords, addWarning } from "../services/moderation.js";
import { logModAction, ModLogColors } from "../services/modlog.js";

// Spam tracking: guildId:userId -> message timestamps
const spamMap = new Map<string, number[]>();

const event: Event = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;

    // Auto-mod checks (guild only, skip admins)
    if (message.guildId && message.member) {
      const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isAdmin) {
        const triggered = await runAutomod(message);
        if (triggered) return;
      }
    }

    // @mention AI chat (existing logic)
    const isMentioned = message.mentions.has(message.client.user!);
    const isReplyToBot =
      message.reference &&
      (await message.channel.messages.fetch(message.reference.messageId!).catch(() => null))
        ?.author?.id === message.client.user!.id;

    if (!isMentioned && !isReplyToBot) return;

    const content = message.content
      .replace(new RegExp(`<@!?${message.client.user!.id}>`, "g"), "")
      .trim();

    if (!content) return;

    try {
      if ("sendTyping" in message.channel) {
        await message.channel.sendTyping();
      }

      const reply = await chat(
        message.author.id,
        message.guildId ?? "dm",
        content
      );

      const response = reply.length > 2000 ? reply.substring(0, 1997) + "..." : reply;
      await message.reply(response);
    } catch (error) {
      console.error("Gemini error:", error);
      await message.reply("AI is temporarily unavailable, please try again later.");
    }
  },
};

async function runAutomod(message: Message): Promise<boolean> {
  let config;
  try {
    config = await getGuildConfig(message.guildId!);
  } catch (error) {
    console.error("Auto-mod config error:", error);
    return false;
  }

  // 1. Banned words
  if (config.automodBannedWords) {
    const words = await getBannedWords(message.guildId!);
    const lower = message.content.toLowerCase();
    const found = words.find((w) => lower.includes(w));
    if (found) {
      await handleAutomod(message, config, `Banned word: ${found}`);
      return true;
    }
  }

  // 2. Spam detection
  if (config.automodSpam) {
    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    const timestamps = spamMap.get(key) ?? [];
    const cutoff = now - config.spamInterval * 1000;
    const recent = timestamps.filter((t) => t > cutoff);
    recent.push(now);
    spamMap.set(key, recent);

    if (recent.length > config.spamMaxMessages) {
      spamMap.set(key, []);
      await handleAutomod(message, config, "Spam detected");
      return true;
    }
  }

  // 3. Link filter
  if (config.automodLinks) {
    if (/https?:\/\/\S+/i.test(message.content)) {
      await handleAutomod(message, config, "Links are not allowed");
      return true;
    }
  }

  // 4. Mass mentions
  if (config.automodMassMentions) {
    if (message.mentions.users.size >= config.massMentionLimit) {
      await handleAutomod(message, config, "Too many mentions");
      return true;
    }
  }

  return false;
}

async function handleAutomod(
  message: Message,
  config: Awaited<ReturnType<typeof getGuildConfig>>,
  reason: string
) {
  // Delete the message
  try {
    await message.delete();
  } catch {
    // Message may already be deleted
  }

  // Send temporary notice
  try {
    const notice = await message.channel.send(
      `<@${message.author.id}> [Auto-mod] Your message was removed: ${reason}`
    );
    setTimeout(() => notice.delete().catch(() => {}), 5000);
  } catch {
    // Channel may not be accessible
  }

  // Log to automod channel
  try {
    await logModAction(message.guild!, "automod", {
      action: `Auto-mod: ${reason}`,
      target: `${message.author.tag} (${message.author.id})`,
      reason,
      color: ModLogColors.AUTOMOD,
    });
  } catch (error) {
    console.error("Auto-mod log error:", error);
  }

  // Auto-warn if escalation is configured
  if (config.warnMuteThreshold || config.warnKickThreshold || config.warnBanThreshold) {
    try {
      const count = await addWarning(
        message.guildId!,
        message.author.id,
        message.client.user!.id,
        `[Auto-mod] ${reason}`
      );

      const member = message.member!;

      if (config.warnBanThreshold && count >= config.warnBanThreshold && member.bannable) {
        await member.ban({ reason: `Auto-escalation: ${count} warnings` });
        await logModAction(message.guild!, "moderation", {
          action: "Auto-Ban",
          target: `${message.author.tag} (${message.author.id})`,
          moderator: "Auto-escalation",
          reason: `Reached ${count} warnings`,
          color: ModLogColors.BAN,
        });
      } else if (config.warnKickThreshold && count >= config.warnKickThreshold && member.kickable) {
        await member.kick(`Auto-escalation: ${count} warnings`);
        await logModAction(message.guild!, "moderation", {
          action: "Auto-Kick",
          target: `${message.author.tag} (${message.author.id})`,
          moderator: "Auto-escalation",
          reason: `Reached ${count} warnings`,
          color: ModLogColors.KICK,
        });
      } else if (config.warnMuteThreshold && count >= config.warnMuteThreshold) {
        const duration = config.muteDuration * 60 * 1000;
        await member.timeout(duration, `Auto-escalation: ${count} warnings`);
        await logModAction(message.guild!, "moderation", {
          action: `Auto-Mute (${config.muteDuration}min)`,
          target: `${message.author.tag} (${message.author.id})`,
          moderator: "Auto-escalation",
          reason: `Reached ${count} warnings`,
          color: ModLogColors.WARN,
        });
      }
    } catch (error) {
      console.error("Auto-mod escalation error:", error);
    }
  }
}

export default event;
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/events/messageCreate.ts
git commit -m "feat: add auto-mod checks in messageCreate (banned words, spam, links, mass mentions)"
```

---

### Task 12: Deploy Commands + Build Verification

- [ ] **Step 1: Build**

Run: `pnpm run build`
Expected: clean build, no errors

- [ ] **Step 2: Deploy commands**

Run: `pnpm run deploy-commands`
Expected: all commands registered globally (should show the new count)

- [ ] **Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: Phase 2 moderation implementation complete"
```

- [ ] **Step 4: Push and create PR**

```bash
git push -u origin feat/phase2-moderation
```
