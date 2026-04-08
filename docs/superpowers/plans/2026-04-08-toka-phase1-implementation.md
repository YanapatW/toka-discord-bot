# ToKa Discord Bot — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully working Discord bot with AI chat (Gemini 2.0 Flash), channel restriction management, and Docker deployment.

**Architecture:** Plugin/handler system that auto-discovers commands and events from the filesystem. Prisma ORM for PostgreSQL persistence. Google Gen AI SDK (`@google/genai`) for Gemini chat. All interactions via Discord slash commands.

**Tech Stack:** Node.js, TypeScript, discord.js v14, @google/genai, Prisma, PostgreSQL 17, Docker, pnpm

---

## File Structure

```
bot/
├── src/
│   ├── index.ts                    # Entry point — init client, load handlers, login
│   ├── config.ts                   # Env vars + bot config (validated)
│   ├── handlers/
│   │   ├── commandHandler.ts       # Scan src/commands/, register slash commands
│   │   └── eventHandler.ts         # Scan src/events/, register listeners
│   ├── commands/
│   │   ├── ai/
│   │   │   ├── chat.ts             # /chat <message>
│   │   │   └── reset.ts            # /reset
│   │   ├── admin/
│   │   │   ├── setchannel.ts       # /setchannel
│   │   │   ├── removechannel.ts    # /removechannel
│   │   │   └── listchannels.ts     # /listchannels
│   │   └── general/
│   │       ├── ping.ts             # /ping
│   │       └── help.ts             # /help
│   ├── events/
│   │   ├── ready.ts                # Bot online log
│   │   └── interactionCreate.ts    # Route slash commands + channel restriction + cooldown
│   ├── services/
│   │   ├── gemini.ts               # Gemini API wrapper
│   │   ├── settings.ts             # Channel restriction CRUD (DB)
│   │   └── database.ts             # Prisma client singleton
│   └── types/
│       └── index.ts                # Command + Event interfaces, extended Client
├── prisma/
│   └── schema.prisma               # DB schema
├── scripts/
│   └── deploy-commands.ts          # One-off slash command registration
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── package.json
└── tsconfig.json
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `bot/package.json`
- Create: `bot/tsconfig.json`
- Create: `bot/.env.example`

- [ ] **Step 1: Initialize package.json**

```bash
cd bot && pnpm init
```

Then replace contents of `bot/package.json`:

```json
{
  "name": "toka-discord-bot",
  "version": "1.0.0",
  "description": "ToKa — multi-purpose Discord bot with AI chat",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "deploy-commands": "tsx scripts/deploy-commands.ts",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "keywords": [],
  "license": "ISC"
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd bot && pnpm add discord.js @google/genai @prisma/client
```

- [ ] **Step 3: Install dev dependencies**

```bash
cd bot && pnpm add -D typescript tsx prisma @types/node
```

- [ ] **Step 4: Create tsconfig.json**

Create `bot/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create .env.example**

Create `bot/.env.example`:

```env
# Discord Bot
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# Gemini AI
GEMINI_API_KEY=

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme
POSTGRES_DB=discordbot
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/discordbot
```

- [ ] **Step 6: Update .gitignore**

Append to root `.gitignore`:

```
# Bot
bot/node_modules/
bot/dist/
bot/.env
bot/.env.local
```

- [ ] **Step 7: Verify build works**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors (no source files yet, should pass cleanly).

- [ ] **Step 8: Commit**

```bash
git add bot/package.json bot/pnpm-lock.yaml bot/tsconfig.json bot/.env.example .gitignore
git commit -m "feat: scaffold bot project with dependencies"
```

---

### Task 2: Prisma Schema & Database Service

**Files:**
- Create: `bot/prisma/schema.prisma`
- Create: `bot/src/services/database.ts`

- [ ] **Step 1: Create Prisma schema**

Create `bot/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ChannelRestriction {
  id        Int      @id @default(autoincrement())
  guildId   String   @map("guild_id")
  command   String
  channelId String   @map("channel_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([guildId, command, channelId])
  @@map("channel_restrictions")
}

model ConversationHistory {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id")
  guildId   String   @map("guild_id")
  role      String
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  @@map("conversation_history")
}
```

- [ ] **Step 2: Generate Prisma Client**

```bash
cd bot && pnpm exec prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Create database service**

Create `bot/src/services/database.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
```

- [ ] **Step 4: Commit**

```bash
git add bot/prisma/schema.prisma bot/src/services/database.ts
git commit -m "feat: add Prisma schema and database service"
```

---

### Task 3: Config & Types

**Files:**
- Create: `bot/src/config.ts`
- Create: `bot/src/types/index.ts`

- [ ] **Step 1: Create config**

Create `bot/src/config.ts`:

```typescript
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  discordClientId: required("DISCORD_CLIENT_ID"),
  geminiApiKey: required("GEMINI_API_KEY"),
  databaseUrl: required("DATABASE_URL"),
};
```

- [ ] **Step 2: Install dotenv**

```bash
cd bot && pnpm add dotenv
```

- [ ] **Step 3: Create types**

Create `bot/src/types/index.ts`:

```typescript
import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | SlashCommandSubcommandsOnlyBuilder;
  cooldown?: number;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  cooldowns: Collection<string, Collection<string, number>>;
}
```

- [ ] **Step 4: Verify types compile**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add bot/src/config.ts bot/src/types/index.ts bot/package.json bot/pnpm-lock.yaml
git commit -m "feat: add config validation and type definitions"
```

---

### Task 4: Command & Event Handlers

**Files:**
- Create: `bot/src/handlers/commandHandler.ts`
- Create: `bot/src/handlers/eventHandler.ts`

- [ ] **Step 1: Create command handler**

Create `bot/src/handlers/commandHandler.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import { Collection, REST, Routes } from "discord.js";
import { config } from "../config.js";
import { Command, ExtendedClient } from "../types/index.js";

export async function loadCommands(client: ExtendedClient): Promise<void> {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, "..", "commands");
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const commandModule = await import(filePath);
      const command: Command = commandModule.default ?? commandModule;

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[WARNING] Command at ${filePath} missing "data" or "execute".`);
      }
    }
  }

  console.log(`Loaded ${client.commands.size} commands.`);
}

export async function registerCommands(client: ExtendedClient): Promise<void> {
  const rest = new REST().setToken(config.discordToken);
  const commandData = client.commands.map((cmd) => cmd.data.toJSON());

  try {
    console.log(`Registering ${commandData.length} slash commands...`);
    await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: commandData,
    });
    console.log("Slash commands registered globally.");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
}
```

- [ ] **Step 2: Create event handler**

Create `bot/src/handlers/eventHandler.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import { ExtendedClient } from "../types/index.js";
import { Event } from "../types/index.js";

export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = path.join(__dirname, "..", "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const eventModule = await import(filePath);
    const event: Event = eventModule.default ?? eventModule;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  console.log(`Loaded ${eventFiles.length} events.`);
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add bot/src/handlers/
git commit -m "feat: add command and event handlers with auto-discovery"
```

---

### Task 5: Entry Point & Events

**Files:**
- Create: `bot/src/index.ts`
- Create: `bot/src/events/ready.ts`
- Create: `bot/src/events/interactionCreate.ts`

- [ ] **Step 1: Create entry point**

Create `bot/src/index.ts`:

```typescript
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { loadCommands, registerCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";
import { ExtendedClient } from "./types/index.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
}) as ExtendedClient;

client.commands = new Collection();
client.cooldowns = new Collection();

async function main(): Promise<void> {
  await loadCommands(client);
  await loadEvents(client);
  await registerCommands(client);
  await client.login(config.discordToken);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Create ready event**

Create `bot/src/events/ready.ts`:

```typescript
import { Events, Client } from "discord.js";
import { Event } from "../types/index.js";

const event: Event = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  },
};

export default event;
```

- [ ] **Step 3: Create interactionCreate event**

Create `bot/src/events/interactionCreate.ts`:

```typescript
import { Collection, Events, Interaction, MessageFlags } from "discord.js";
import { Event, ExtendedClient } from "../types/index.js";
import { getChannelRestrictions } from "../services/settings.js";

const event: Event = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} found.`);
      return;
    }

    // Channel restriction check
    if (interaction.guildId) {
      const allowedChannels = await getChannelRestrictions(
        interaction.guildId,
        interaction.commandName
      );

      if (allowedChannels.length > 0 && !allowedChannels.includes(interaction.channelId)) {
        const channelMentions = allowedChannels.map((id) => `<#${id}>`).join(", ");
        await interaction.reply({
          content: `This command can only be used in ${channelMentions}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Cooldown check
    const { cooldowns } = client;

    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name)!;
    const cooldownAmount = (command.cooldown ?? 0) * 1000;

    if (cooldownAmount > 0 && timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);
        await interaction.reply({
          content: `Please wait — you can use \`/${command.data.name}\` again <t:${expiredTimestamp}:R>.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Execute command
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const reply = {
        content: "There was an error executing this command.",
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};

export default event;
```

- [ ] **Step 4: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: Will fail because `settings.ts` doesn't exist yet. That's expected — we'll create it in the next task.

- [ ] **Step 5: Commit**

```bash
git add bot/src/index.ts bot/src/events/
git commit -m "feat: add entry point and event handlers"
```

---

### Task 6: Settings Service (Channel Restrictions)

**Files:**
- Create: `bot/src/services/settings.ts`

- [ ] **Step 1: Create settings service**

Create `bot/src/services/settings.ts`:

```typescript
import prisma from "./database.js";

export async function getChannelRestrictions(
  guildId: string,
  command: string
): Promise<string[]> {
  const restrictions = await prisma.channelRestriction.findMany({
    where: { guildId, command },
    select: { channelId: true },
  });
  return restrictions.map((r) => r.channelId);
}

export async function addChannelRestriction(
  guildId: string,
  command: string,
  channelId: string
): Promise<boolean> {
  try {
    await prisma.channelRestriction.create({
      data: { guildId, command, channelId },
    });
    return true;
  } catch {
    // Unique constraint violation — already exists
    return false;
  }
}

export async function removeChannelRestriction(
  guildId: string,
  command: string,
  channelId: string
): Promise<boolean> {
  const result = await prisma.channelRestriction.deleteMany({
    where: { guildId, command, channelId },
  });
  return result.count > 0;
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add bot/src/services/settings.ts
git commit -m "feat: add channel restriction service"
```

---

### Task 7: Gemini Service

**Files:**
- Create: `bot/src/services/gemini.ts`

- [ ] **Step 1: Create Gemini service**

Create `bot/src/services/gemini.ts`:

```typescript
import { GoogleGenAI, Content } from "@google/genai";
import { config } from "../config.js";
import prisma from "./database.js";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const SYSTEM_PROMPT =
  "You are ToKa, a helpful and friendly Discord bot assistant. Keep responses concise and under 2000 characters (Discord message limit).";

const MAX_HISTORY = 20;

export async function chat(
  userId: string,
  guildId: string,
  message: string
): Promise<string> {
  // Fetch conversation history from DB
  const history = await prisma.conversationHistory.findMany({
    where: { userId, guildId },
    orderBy: { createdAt: "asc" },
  });

  // Build contents array for Gemini
  const contents: Content[] = history.map((h) => ({
    role: h.role as "user" | "model",
    parts: [{ text: h.content }],
  }));

  // Add current message
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Call Gemini
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  const reply = response.text ?? "I couldn't generate a response.";

  // Save user message + model response to DB
  await prisma.conversationHistory.createMany({
    data: [
      { userId, guildId, role: "user", content: message },
      { userId, guildId, role: "model", content: reply },
    ],
  });

  // Enforce history cap — delete oldest messages beyond limit
  const totalMessages = await prisma.conversationHistory.count({
    where: { userId, guildId },
  });

  if (totalMessages > MAX_HISTORY) {
    const excess = totalMessages - MAX_HISTORY;
    const oldestMessages = await prisma.conversationHistory.findMany({
      where: { userId, guildId },
      orderBy: { createdAt: "asc" },
      take: excess,
      select: { id: true },
    });

    await prisma.conversationHistory.deleteMany({
      where: { id: { in: oldestMessages.map((m) => m.id) } },
    });
  }

  return reply;
}

export async function resetHistory(
  userId: string,
  guildId: string
): Promise<number> {
  const result = await prisma.conversationHistory.deleteMany({
    where: { userId, guildId },
  });
  return result.count;
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add bot/src/services/gemini.ts
git commit -m "feat: add Gemini AI service with conversation history"
```

---

### Task 8: General Commands (ping, help)

**Files:**
- Create: `bot/src/commands/general/ping.ts`
- Create: `bot/src/commands/general/help.ts`

- [ ] **Step 1: Create ping command**

Create `bot/src/commands/general/ping.ts`:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    const ws = interaction.client.ws.ping;
    await interaction.reply(`Pong! 🏓 WebSocket: ${ws}ms`);
  },
};

export default command;
```

- [ ] **Step 2: Create help command**

Create `bot/src/commands/general/help.ts`:

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command, ExtendedClient } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;

    const embed = new EmbedBuilder()
      .setTitle("ToKa — Commands")
      .setColor(0x5865f2)
      .setDescription(
        client.commands
          .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
          .join("\n")
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
```

- [ ] **Step 3: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add bot/src/commands/general/
git commit -m "feat: add /ping and /help commands"
```

---

### Task 9: AI Commands (chat, reset)

**Files:**
- Create: `bot/src/commands/ai/chat.ts`
- Create: `bot/src/commands/ai/reset.ts`

- [ ] **Step 1: Create chat command**

Create `bot/src/commands/ai/chat.ts`:

```typescript
import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { chat } from "../../services/gemini.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Talk to ToKa AI")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Your message")
        .setRequired(true)
    ),

  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message", true);

    await interaction.deferReply();

    try {
      const reply = await chat(
        interaction.user.id,
        interaction.guildId ?? "dm",
        message
      );

      // Discord message limit is 2000 chars
      if (reply.length > 2000) {
        await interaction.editReply(reply.substring(0, 1997) + "...");
      } else {
        await interaction.editReply(reply);
      }
    } catch (error) {
      console.error("Gemini error:", error);
      await interaction.editReply(
        "AI is temporarily unavailable, please try again later."
      );
    }
  },
};

export default command;
```

- [ ] **Step 2: Create reset command**

Create `bot/src/commands/ai/reset.ts`:

```typescript
import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/index.js";
import { resetHistory } from "../../services/gemini.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Clear your AI conversation history"),

  async execute(interaction: ChatInputCommandInteraction) {
    const deleted = await resetHistory(
      interaction.user.id,
      interaction.guildId ?? "dm"
    );

    await interaction.reply({
      content:
        deleted > 0
          ? `Cleared ${deleted} messages from your conversation history.`
          : "You have no conversation history to clear.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
```

- [ ] **Step 3: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add bot/src/commands/ai/
git commit -m "feat: add /chat and /reset AI commands"
```

---

### Task 10: Admin Commands (setchannel, removechannel, listchannels)

**Files:**
- Create: `bot/src/commands/admin/setchannel.ts`
- Create: `bot/src/commands/admin/removechannel.ts`
- Create: `bot/src/commands/admin/listchannels.ts`

- [ ] **Step 1: Create setchannel command**

Create `bot/src/commands/admin/setchannel.ts`:

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { addChannelRestriction } from "../../services/settings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Restrict a command to a specific channel")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command name to restrict")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to allow the command in")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const channel = interaction.options.getChannel("channel", true);

    const added = await addChannelRestriction(
      interaction.guildId!,
      commandName,
      channel.id
    );

    if (added) {
      await interaction.reply({
        content: `\`/${commandName}\` is now restricted to <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `\`/${commandName}\` is already allowed in <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 2: Create removechannel command**

Create `bot/src/commands/admin/removechannel.ts`:

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { removeChannelRestriction } from "../../services/settings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("removechannel")
    .setDescription("Remove a channel restriction from a command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command name")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to remove restriction from")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);
    const channel = interaction.options.getChannel("channel", true);

    const removed = await removeChannelRestriction(
      interaction.guildId!,
      commandName,
      channel.id
    );

    if (removed) {
      await interaction.reply({
        content: `Removed <#${channel.id}> restriction from \`/${commandName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `No restriction found for \`/${commandName}\` in <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 3: Create listchannels command**

Create `bot/src/commands/admin/listchannels.ts`:

```typescript
import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/index.js";
import { getChannelRestrictions } from "../../services/settings.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("listchannels")
    .setDescription("Show channel restrictions for a command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Command name")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString("command", true);

    const channels = await getChannelRestrictions(
      interaction.guildId!,
      commandName
    );

    if (channels.length === 0) {
      await interaction.reply({
        content: `\`/${commandName}\` has no channel restrictions (works everywhere).`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      const list = channels.map((id) => `<#${id}>`).join(", ");
      await interaction.reply({
        content: `\`/${commandName}\` is restricted to: ${list}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
```

- [ ] **Step 4: Verify compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add bot/src/commands/admin/
git commit -m "feat: add admin channel restriction commands"
```

---

### Task 11: Deploy Commands Script

**Files:**
- Create: `bot/scripts/deploy-commands.ts`

- [ ] **Step 1: Create deploy script**

Create `bot/scripts/deploy-commands.ts`:

```typescript
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { REST, Routes } from "discord.js";
import { Command } from "../src/types/index.js";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const commands: object[] = [];
const commandsPath = path.join(__dirname, "..", "src", "commands");
const commandFolders = fs.readdirSync(commandsPath);

async function main() {
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".ts"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const commandModule = await import(filePath);
      const command: Command = commandModule.default ?? commandModule;

      if ("data" in command) {
        commands.push(command.data.toJSON());
      }
    }
  }

  const rest = new REST().setToken(token);

  console.log(`Registering ${commands.length} slash commands...`);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log("Done!");
}

main().catch(console.error);
```

- [ ] **Step 2: Test script compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors (script is under `scripts/`, not in `src/`, so tsconfig excludes it — that's fine since tsx runs it directly).

- [ ] **Step 3: Commit**

```bash
git add bot/scripts/deploy-commands.ts
git commit -m "feat: add slash command deployment script"
```

---

### Task 12: Docker Setup

**Files:**
- Create: `bot/Dockerfile`
- Create: `bot/docker-compose.yml`
- Create: `bot/.dockerignore`

- [ ] **Step 1: Create Dockerfile**

Create `bot/Dockerfile`:

```dockerfile
# Build stage
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN pnpm run build

# Run stage
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile --prod
RUN pnpm exec prisma generate

COPY --from=builder /app/dist ./dist/

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

Create `bot/docker-compose.yml`:

```yaml
services:
  bot:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 3: Create .dockerignore**

Create `bot/.dockerignore`:

```
node_modules
dist
.env
.env.*
.git
*.md
```

- [ ] **Step 4: Commit**

```bash
git add bot/Dockerfile bot/docker-compose.yml bot/.dockerignore
git commit -m "feat: add Docker and docker-compose setup"
```

---

### Task 13: Final Verification & Build

- [ ] **Step 1: Verify full TypeScript compilation**

```bash
cd bot && pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify build produces dist/**

```bash
cd bot && pnpm run build
```

Expected: `dist/` directory created with compiled JS files.

- [ ] **Step 3: Verify Docker build**

```bash
cd bot && docker build -t toka-bot .
```

Expected: Image builds successfully.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify build and finalize Phase 1"
```
