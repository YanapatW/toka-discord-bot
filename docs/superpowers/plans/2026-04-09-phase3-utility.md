# Phase 3: Utility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add utility features: polls with button voting, self-assignable roles, timed reminders, and server/user info commands.

**Architecture:** New Prisma models (Poll, PollOption, PollVote, SelfAssignableRole, Reminder). Three new services for CRUD. Button interaction handling added to interactionCreate. Reminder scheduler runs on a 30s interval in index.ts.

**Tech Stack:** TypeScript, discord.js v14, Prisma 7, PostgreSQL

---

## File Map

### New files
- `src/services/poll.ts` — poll CRUD + voting
- `src/services/roles.ts` — self-assignable role CRUD
- `src/services/reminder.ts` — reminder CRUD + scheduler queries
- `src/commands/utility/poll.ts` — /poll command
- `src/commands/utility/role.ts` — /role command with subcommands
- `src/commands/utility/remind.ts` — /remind command
- `src/commands/utility/reminders.ts` — /reminders command
- `src/commands/utility/cancelreminder.ts` — /cancelreminder command
- `src/commands/utility/serverinfo.ts` — /serverinfo command
- `src/commands/utility/userinfo.ts` — /userinfo command

### Modified files
- `prisma/schema.prisma` — add 5 new models
- `src/events/interactionCreate.ts` — add button interaction handler for polls
- `src/index.ts` — add reminder scheduler interval

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new models to schema**

Add these models at the end of `prisma/schema.prisma`:

```prisma
model Poll {
  id        Int      @id @default(autoincrement())
  guildId   String   @map("guild_id")
  channelId String   @map("channel_id")
  messageId String   @map("message_id")
  question  String
  creatorId String   @map("creator_id")
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")

  options PollOption[]
  votes   PollVote[]

  @@map("polls")
}

model PollOption {
  id       Int    @id @default(autoincrement())
  pollId   Int    @map("poll_id")
  label    String
  position Int

  poll  Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes PollVote[]

  @@map("poll_options")
}

model PollVote {
  id       Int    @id @default(autoincrement())
  pollId   Int    @map("poll_id")
  userId   String @map("user_id")
  optionId Int    @map("option_id")

  poll   Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  option PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)

  @@unique([pollId, userId])
  @@map("poll_votes")
}

model SelfAssignableRole {
  id      Int    @id @default(autoincrement())
  guildId String @map("guild_id")
  roleId  String @map("role_id")

  @@unique([guildId, roleId])
  @@map("self_assignable_roles")
}

model Reminder {
  id        Int      @id @default(autoincrement())
  guildId   String   @map("guild_id")
  channelId String   @map("channel_id")
  userId    String   @map("user_id")
  message   String
  remindAt  DateTime @map("remind_at")
  fired     Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("reminders")
}
```

- [ ] **Step 2: Generate migration**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec prisma migrate dev --name phase3_utility`
Expected: migration created and applied

- [ ] **Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Phase 3 database schema (polls, self-assignable roles, reminders)"
```

---

### Task 2: Poll Service

**Files:**
- Create: `src/services/poll.ts`

- [ ] **Step 1: Create the service file**

```typescript
import prisma from "./database.js";

export async function createPoll(
  guildId: string,
  channelId: string,
  messageId: string,
  creatorId: string,
  question: string,
  options: string[]
) {
  return prisma.poll.create({
    data: {
      guildId,
      channelId,
      messageId,
      creatorId,
      question,
      options: {
        create: options.map((label, i) => ({ label, position: i })),
      },
    },
    include: { options: true },
  });
}

export async function vote(pollId: number, userId: string, optionId: number) {
  return prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId } },
    create: { pollId, userId, optionId },
    update: { optionId },
  });
}

export async function getPollResults(pollId: number) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  });
}

export async function getPollByMessageId(messageId: string) {
  return prisma.poll.findFirst({
    where: { messageId },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  });
}

export async function endPoll(pollId: number) {
  return prisma.poll.update({
    where: { id: pollId },
    data: { active: false },
  });
}
```

- [ ] **Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/services/poll.ts
git commit -m "feat: add poll service (create, vote, results, end)"
```

---

### Task 3: Roles + Reminder Services

**Files:**
- Create: `src/services/roles.ts`
- Create: `src/services/reminder.ts`

- [ ] **Step 1: Create roles service**

```typescript
import prisma from "./database.js";

export async function addSelfAssignableRole(
  guildId: string,
  roleId: string
): Promise<boolean> {
  try {
    await prisma.selfAssignableRole.create({ data: { guildId, roleId } });
    return true;
  } catch {
    return false;
  }
}

export async function removeSelfAssignableRole(
  guildId: string,
  roleId: string
): Promise<boolean> {
  const result = await prisma.selfAssignableRole.deleteMany({
    where: { guildId, roleId },
  });
  return result.count > 0;
}

export async function getSelfAssignableRoles(guildId: string): Promise<string[]> {
  const roles = await prisma.selfAssignableRole.findMany({
    where: { guildId },
    select: { roleId: true },
  });
  return roles.map((r) => r.roleId);
}

export async function isSelfAssignable(
  guildId: string,
  roleId: string
): Promise<boolean> {
  const count = await prisma.selfAssignableRole.count({
    where: { guildId, roleId },
  });
  return count > 0;
}
```

- [ ] **Step 2: Create reminder service**

```typescript
import prisma from "./database.js";

export async function createReminder(
  guildId: string,
  channelId: string,
  userId: string,
  message: string,
  remindAt: Date
) {
  return prisma.reminder.create({
    data: { guildId, channelId, userId, message, remindAt },
  });
}

export async function getUserReminders(guildId: string, userId: string) {
  return prisma.reminder.findMany({
    where: { guildId, userId, fired: false },
    orderBy: { remindAt: "asc" },
  });
}

export async function cancelReminder(
  id: number,
  userId: string
): Promise<boolean> {
  const result = await prisma.reminder.deleteMany({
    where: { id, userId, fired: false },
  });
  return result.count > 0;
}

export async function getDueReminders() {
  return prisma.reminder.findMany({
    where: { fired: false, remindAt: { lte: new Date() } },
  });
}

export async function markFired(id: number) {
  return prisma.reminder.update({
    where: { id },
    data: { fired: true },
  });
}

export function parseTime(input: string): number | null {
  const match = input.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const ms = value * multipliers[unit];
  const maxMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  return ms > 0 && ms <= maxMs ? ms : null;
}
```

- [ ] **Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/services/roles.ts src/services/reminder.ts
git commit -m "feat: add roles and reminder services"
```

---

### Task 4: Poll Command + Button Handler

**Files:**
- Create: `src/commands/utility/poll.ts`
- Modify: `src/events/interactionCreate.ts`

- [ ] **Step 1: Create poll command**

```typescript
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { createPoll } from "../../services/poll.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll with button voting")
    .addStringOption((o) =>
      o.setName("question").setDescription("Poll question").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("option1").setDescription("Option 1").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("option2").setDescription("Option 2").setRequired(true)
    )
    .addStringOption((o) => o.setName("option3").setDescription("Option 3"))
    .addStringOption((o) => o.setName("option4").setDescription("Option 4"))
    .addStringOption((o) => o.setName("option5").setDescription("Option 5"))
    .addStringOption((o) => o.setName("option6").setDescription("Option 6"))
    .addStringOption((o) => o.setName("option7").setDescription("Option 7"))
    .addStringOption((o) => o.setName("option8").setDescription("Option 8"))
    .addStringOption((o) => o.setName("option9").setDescription("Option 9"))
    .addStringOption((o) => o.setName("option10").setDescription("Option 10")),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);
    const options: string[] = [];

    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    // Send initial message to get messageId
    const embed = buildPollEmbed(question, options, new Map(), 0);
    const rows = buildPollButtons(0, options, true);

    const reply = await interaction.reply({
      embeds: [embed],
      components: rows,
      fetchReply: true,
    });

    // Store in DB
    await createPoll(
      interaction.guildId!,
      interaction.channelId,
      reply.id,
      interaction.user.id,
      question,
      options
    );
  },
};

export function buildPollEmbed(
  question: string,
  optionLabels: string[],
  voteCounts: Map<number, number>,
  totalVotes: number
) {
  const lines = optionLabels.map((label, i) => {
    const count = voteCounts.get(i) ?? 0;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
    return `**${i + 1}.** ${label}\n${bar} ${count} votes (${pct}%)`;
  });

  return new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(lines.join("\n\n"))
    .setColor(0x5865f2)
    .setFooter({ text: `${totalVotes} total votes` });
}

export function buildPollButtons(
  pollId: number,
  optionLabels: string[],
  active: boolean
) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  // Vote buttons (max 5 per row, max 2 rows = 10 options)
  for (let i = 0; i < optionLabels.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = optionLabels.slice(i, i + 5);
    chunk.forEach((label, j) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_vote_${pollId}_${i + j}`)
          .setLabel(label.length > 80 ? label.substring(0, 77) + "..." : label)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!active)
      );
    });
    rows.push(row);
  }

  // End poll button
  const endRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`poll_end_${pollId}`)
      .setLabel("End Poll")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!active)
  );
  rows.push(endRow);

  return rows;
}

export default command;
```

- [ ] **Step 2: Add button handler to interactionCreate.ts**

Add these imports at the top of `src/events/interactionCreate.ts`:

```typescript
import { getPollByMessageId, getPollResults, vote, endPoll } from "../services/poll.js";
import { buildPollEmbed, buildPollButtons } from "../commands/utility/poll.js";
```

Add this block at the beginning of the `execute` function (before the `if (!interaction.isChatInputCommand()) return;` line):

```typescript
    // Button interaction handler
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith("poll_vote_")) {
        const parts = customId.split("_");
        const optionIndex = parseInt(parts[3], 10);

        const poll = await getPollByMessageId(interaction.message.id);
        if (!poll || !poll.active) {
          await interaction.reply({
            content: "This poll has ended.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const option = poll.options[optionIndex];
        if (!option) return;

        await vote(poll.id, interaction.user.id, option.id);

        // Refresh results
        const updated = await getPollResults(poll.id);
        if (!updated) return;

        const voteCounts = new Map<number, number>();
        updated.options.forEach((o, i) => voteCounts.set(i, o._count.votes));

        const embed = buildPollEmbed(
          updated.question,
          updated.options.map((o) => o.label),
          voteCounts,
          updated._count.votes
        );

        await interaction.update({
          embeds: [embed],
          components: buildPollButtons(
            updated.id,
            updated.options.map((o) => o.label),
            true
          ),
        });
        return;
      }

      if (customId.startsWith("poll_end_")) {
        const poll = await getPollByMessageId(interaction.message.id);
        if (!poll) return;

        if (interaction.user.id !== poll.creatorId) {
          await interaction.reply({
            content: "Only the poll creator can end this poll.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await endPoll(poll.id);

        const updated = await getPollResults(poll.id);
        if (!updated) return;

        const voteCounts = new Map<number, number>();
        updated.options.forEach((o, i) => voteCounts.set(i, o._count.votes));

        const embed = buildPollEmbed(
          updated.question,
          updated.options.map((o) => o.label),
          voteCounts,
          updated._count.votes
        ).setFooter({ text: `Poll ended — ${updated._count.votes} total votes` });

        await interaction.update({
          embeds: [embed],
          components: buildPollButtons(
            updated.id,
            updated.options.map((o) => o.label),
            false
          ),
        });
        return;
      }

      return;
    }
```

- [ ] **Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/utility/poll.ts src/events/interactionCreate.ts
git commit -m "feat: add /poll command with button voting and live results"
```

---

### Task 5: Role Command

**Files:**
- Create: `src/commands/utility/role.ts`

- [ ] **Step 1: Create role command**

```typescript
import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import {
  addSelfAssignableRole,
  removeSelfAssignableRole,
  getSelfAssignableRoles,
  isSelfAssignable,
} from "../../services/roles.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage self-assignable roles")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Assign a role to yourself")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to add").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a role from yourself")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to remove").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all self-assignable roles")
    )
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Admin: add a role to the self-assignable list")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to allow").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unsetup")
        .setDescription("Admin: remove a role from the self-assignable list")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role to remove").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.member as GuildMember;

    if (sub === "setup" || sub === "unsetup") {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "You need Administrator permission to use this.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (sub === "add") {
      const role = interaction.options.getRole("role", true);

      if (!(await isSelfAssignable(interaction.guildId!, role.id))) {
        await interaction.reply({
          content: `<@&${role.id}> is not a self-assignable role. Use \`/role list\` to see available roles.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await member.roles.add(role.id);
        await interaction.reply({
          content: `You now have the <@&${role.id}> role.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await interaction.reply({
          content: "I can't assign that role. It may be higher than my role.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (sub === "remove") {
      const role = interaction.options.getRole("role", true);

      if (!(await isSelfAssignable(interaction.guildId!, role.id))) {
        await interaction.reply({
          content: `<@&${role.id}> is not a self-assignable role.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await member.roles.remove(role.id);
        await interaction.reply({
          content: `Removed <@&${role.id}> from your roles.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await interaction.reply({
          content: "I can't remove that role. It may be higher than my role.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (sub === "list") {
      const roleIds = await getSelfAssignableRoles(interaction.guildId!);

      await interaction.reply({
        content:
          roleIds.length > 0
            ? `**Self-assignable roles:** ${roleIds.map((id) => `<@&${id}>`).join(", ")}`
            : "No self-assignable roles configured.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "setup") {
      const role = interaction.options.getRole("role", true);
      const added = await addSelfAssignableRole(interaction.guildId!, role.id);

      await interaction.reply({
        content: added
          ? `<@&${role.id}> is now self-assignable.`
          : `<@&${role.id}> is already self-assignable.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (sub === "unsetup") {
      const role = interaction.options.getRole("role", true);
      const removed = await removeSelfAssignableRole(interaction.guildId!, role.id);

      await interaction.reply({
        content: removed
          ? `<@&${role.id}> is no longer self-assignable.`
          : `<@&${role.id}> was not in the self-assignable list.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/utility/role.ts
git commit -m "feat: add /role command with self-assign and admin setup"
```

---

### Task 6: Reminder Commands

**Files:**
- Create: `src/commands/utility/remind.ts`
- Create: `src/commands/utility/reminders.ts`
- Create: `src/commands/utility/cancelreminder.ts`

- [ ] **Step 1: Create remind command**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { createReminder } from "../../services/reminder.js";
import { parseTime } from "../../services/reminder.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addStringOption((o) =>
      o
        .setName("time")
        .setDescription("When to remind (e.g. 30m, 2h, 1d)")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("What to remind you about")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const timeStr = interaction.options.getString("time", true);
    const message = interaction.options.getString("message", true);

    const ms = parseTime(timeStr);
    if (!ms) {
      await interaction.reply({
        content: "Invalid time format. Use `30m`, `2h`, or `1d` (max 30d).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const remindAt = new Date(Date.now() + ms);

    await createReminder(
      interaction.guildId!,
      interaction.channelId,
      interaction.user.id,
      message,
      remindAt
    );

    const timestamp = Math.floor(remindAt.getTime() / 1000);

    await interaction.reply({
      content: `Reminder set! I'll ping you <t:${timestamp}:R> — "${message}"`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
```

- [ ] **Step 2: Create reminders command**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getUserReminders } from "../../services/reminder.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminders")
    .setDescription("List your active reminders"),

  async execute(interaction: ChatInputCommandInteraction) {
    const reminders = await getUserReminders(
      interaction.guildId!,
      interaction.user.id
    );

    if (reminders.length === 0) {
      await interaction.reply({
        content: "You have no active reminders.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Your Reminders")
      .setColor(0x5865f2);

    for (const r of reminders) {
      const timestamp = Math.floor(r.remindAt.getTime() / 1000);
      embed.addFields({
        name: `#${r.id} — <t:${timestamp}:R>`,
        value: r.message,
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
```

- [ ] **Step 3: Create cancelreminder command**

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { cancelReminder } from "../../services/reminder.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("cancelreminder")
    .setDescription("Cancel a reminder")
    .addIntegerOption((o) =>
      o
        .setName("id")
        .setDescription("Reminder ID (from /reminders)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getInteger("id", true);
    const cancelled = await cancelReminder(id, interaction.user.id);

    await interaction.reply({
      content: cancelled
        ? `Reminder #${id} cancelled.`
        : `Reminder #${id} not found or not yours.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
```

- [ ] **Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/utility/remind.ts src/commands/utility/reminders.ts src/commands/utility/cancelreminder.ts
git commit -m "feat: add /remind, /reminders, /cancelreminder commands"
```

---

### Task 7: Server Info + User Info Commands

**Files:**
- Create: `src/commands/utility/serverinfo.ts`
- Create: `src/commands/utility/userinfo.ts`

- [ ] **Step 1: Create serverinfo command**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server information"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(0x5865f2)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: "Owner", value: owner.user.tag, inline: true },
        { name: "Members", value: String(guild.memberCount), inline: true },
        {
          name: "Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Boost Level",
          value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} boosts)`,
          inline: true,
        }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
```

- [ ] **Step 2: Create userinfo command**

```typescript
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { countWarnings } from "../../services/moderation.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show user information")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to check (defaults to yourself)")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild!.members
      .fetch(user.id)
      .catch(() => null) as GuildMember | null;

    const warnings = await countWarnings(interaction.guildId!, user.id);

    const roles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guildId)
          .sort((a, b) => b.position - a.position)
          .map((r) => `<@&${r.id}>`)
          .slice(0, 20)
          .join(", ") || "None"
      : "N/A";

    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "Account Created",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Joined Server",
          value: member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : "N/A",
          inline: true,
        },
        { name: "Warnings", value: String(warnings), inline: true },
        { name: "Roles", value: roles }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
```

- [ ] **Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/commands/utility/serverinfo.ts src/commands/utility/userinfo.ts
git commit -m "feat: add /serverinfo and /userinfo commands"
```

---

### Task 8: Reminder Scheduler + Build Verification

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add reminder scheduler to index.ts**

Add import at the top of `src/index.ts`:

```typescript
import { getDueReminders, markFired } from "./services/reminder.js";
```

Add this after `client.login(config.discordToken)` inside the `main()` function:

```typescript
  // Reminder scheduler — check every 30 seconds
  setInterval(async () => {
    try {
      const due = await getDueReminders();
      for (const reminder of due) {
        try {
          const channel = await client.channels.fetch(reminder.channelId);
          if (channel?.isTextBased()) {
            await channel.send(
              `<@${reminder.userId}> Reminder: ${reminder.message}`
            );
          }
        } catch (error) {
          console.error(`Reminder ${reminder.id} failed:`, error);
        }
        await markFired(reminder.id);
      }
    } catch (error) {
      console.error("Reminder scheduler error:", error);
    }
  }, 30_000);
```

- [ ] **Step 2: Build**

Run: `source ~/.nvm/nvm.sh && nvm use 24 > /dev/null 2>&1 && pnpm run build`
Expected: clean build, no errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add reminder scheduler (30s interval)"
```

- [ ] **Step 4: Push**

```bash
git push -u origin feat/phase3-utility
```
