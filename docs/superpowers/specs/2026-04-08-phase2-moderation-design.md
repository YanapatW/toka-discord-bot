# Phase 2: Moderation — Design Spec

## Goal

Add moderation tools to ToKa: manual mod commands (kick/ban/warn), a configurable warn escalation system, auto-mod with per-server toggles, and dual-category mod logging.

## Database Schema

### GuildConfig

One row per guild. Stores all per-server settings. Created lazily on first interaction with any config command (use `upsert`).

```prisma
model GuildConfig {
  id        Int     @id @default(autoincrement())
  guildId   String  @unique @map("guild_id")

  // Log channels (null = disabled)
  modLogChannelId     String? @map("mod_log_channel_id")
  automodLogChannelId String? @map("automod_log_channel_id")

  // Auto-mod toggles (all off by default)
  automodBannedWords   Boolean @default(false) @map("automod_banned_words")
  automodSpam          Boolean @default(false) @map("automod_spam")
  automodLinks         Boolean @default(false) @map("automod_links")
  automodMassMentions  Boolean @default(false) @map("automod_mass_mentions")

  // Auto-mod thresholds
  spamMaxMessages    Int @default(5)  @map("spam_max_messages")
  spamInterval       Int @default(10) @map("spam_interval")       // seconds
  massMentionLimit   Int @default(5)  @map("mass_mention_limit")

  // Warn escalation thresholds (null = no auto-action)
  warnMuteThreshold  Int? @map("warn_mute_threshold")
  warnKickThreshold  Int? @map("warn_kick_threshold")
  warnBanThreshold   Int? @map("warn_ban_threshold")
  muteDuration       Int  @default(60) @map("mute_duration")      // minutes

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  @@map("guild_config")
}
```

### Warning

One row per warning issued. Never deleted automatically — `clearwarnings` deletes all for a user in a guild.

```prisma
model Warning {
  id          Int      @id @default(autoincrement())
  guildId     String   @map("guild_id")
  userId      String   @map("user_id")
  moderatorId String   @map("moderator_id")
  reason      String
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("warnings")
}
```

### BannedWord

Per-server word list for auto-mod. Case-insensitive matching at check time.

```prisma
model BannedWord {
  id      Int    @id @default(autoincrement())
  guildId String @map("guild_id")
  word    String

  @@unique([guildId, word])
  @@map("banned_words")
}
```

## Commands

### Moderation (`src/commands/moderation/`)

Permissions use Discord's built-in system via `setDefaultMemberPermissions()`. Discord shows "You don't have permission" automatically if the user lacks the required permission.

| Command | Permission | Options | Behavior |
|---|---|---|---|
| `/kick` | `KickMembers` | `user` (required), `reason` (optional, default "No reason provided") | Kick member, log to mod channel |
| `/ban` | `BanMembers` | `user` (required), `reason` (optional) | Ban member, log to mod channel |
| `/unban` | `BanMembers` | `user-id` (string, required), `reason` (optional) | Unban by ID, log to mod channel |
| `/warn` | `ModerateMembers` | `user` (required), `reason` (optional) | Add warning to DB, check escalation thresholds, log to mod channel |
| `/warnings` | `ModerateMembers` | `user` (required) | Show warning history (ephemeral). List each warning with reason, moderator, date |
| `/clearwarnings` | `ModerateMembers` | `user` (required) | Delete all warnings for user in guild, log to mod channel |

### Auto-mod Config (`src/commands/admin/`)

All require `Administrator` permission via `setDefaultMemberPermissions()`.

| Command | Options | Behavior |
|---|---|---|
| `/automod set` | `feature` (choice: banned-words, spam, links, mass-mentions), `enabled` (boolean) | Toggle a feature on/off for this server |
| `/automod config` | `setting` (choice: spam-max-messages, spam-interval, mass-mention-limit), `value` (integer) | Set a threshold value |
| `/automod status` | none | Show all features (on/off) and threshold values (ephemeral) |

### Banned Words (`src/commands/admin/`)

All require `Administrator` permission.

| Command | Options | Behavior |
|---|---|---|
| `/bannedwords add` | `word` (string) | Add word/phrase to guild's banned list |
| `/bannedwords remove` | `word` (string) | Remove word/phrase |
| `/bannedwords list` | none | List all banned words (ephemeral) |

### Warn Config (`src/commands/admin/`)

Requires `Administrator` permission.

| Command | Options | Behavior |
|---|---|---|
| `/warnconfig set` | `action` (choice: mute, kick, ban), `threshold` (integer) | Set warn count threshold for auto-action. Set to 0 to disable. |
| `/warnconfig status` | none | Show current thresholds and mute duration (ephemeral) |
| `/warnconfig mute-duration` | `minutes` (integer) | Set how long auto-mute lasts |

### Log Channels (`src/commands/admin/`)

Requires `Administrator` permission.

| Command | Options | Behavior |
|---|---|---|
| `/setlogchannel` | `type` (choice: moderation, automod), `channel` (channel) | Set log channel for a category |
| `/removelogchannel` | `type` (choice: moderation, automod) | Disable logging for a category (set to null) |

## Services

### `src/services/moderation.ts`

Guild config CRUD:
- `getGuildConfig(guildId)` — returns config, or creates default if none exists (upsert)
- `updateGuildConfig(guildId, data)` — partial update

Warning CRUD:
- `addWarning(guildId, userId, moderatorId, reason)` — insert + return total count
- `getWarnings(guildId, userId)` — list all warnings for a user
- `clearWarnings(guildId, userId)` — delete all warnings for a user
- `countWarnings(guildId, userId)` — count for escalation check

Banned words CRUD:
- `addBannedWord(guildId, word)` — add (lowercase)
- `removeBannedWord(guildId, word)` — remove
- `getBannedWords(guildId)` — list all

### `src/services/modlog.ts`

Logging helper:
- `logModAction(guild, type, data)` — sends an embed to the appropriate log channel
  - `type`: `"moderation"` or `"automod"`
  - `data`: `{ action, target, moderator?, reason, color }`
  - Looks up the channel ID from `GuildConfig`, sends embed. No-op if channel not set.

Embed format:
- Title: action name (e.g., "Member Warned", "Auto-mod: Banned Word")
- Color: red (#FF0000) for ban, orange (#FF8C00) for kick, yellow (#FFD700) for warn, blue (#3498DB) for auto-mod
- Fields: Target, Moderator (or "Auto-mod"), Reason, Timestamp
- Footer: warning count (for warn actions)

## Auto-mod (messageCreate event)

Extends the existing `src/events/messageCreate.ts`. Runs before the @mention AI chat logic. Skips bot messages and messages from users with `Administrator` permission.

Check order (short-circuit on first match):
1. **Banned words** — if enabled, check message content against guild's word list (case-insensitive substring match)
2. **Spam** — if enabled, track messages per user in an in-memory `Map<string, number[]>` (userId → timestamps). If count exceeds `spamMaxMessages` within `spamInterval` seconds, trigger. Clean up old entries on each check.
3. **Links** — if enabled, match URLs with regex `/https?:\/\/\S+/i`. Delete any message containing a link.
4. **Mass mentions** — if enabled, count `message.mentions.users.size`. If >= `massMentionLimit`, trigger.

When triggered:
1. Delete the message
2. Send ephemeral-like reply (auto-delete after 5s): "[Auto-mod] Your message was removed: {reason}"
3. If warn escalation is configured, auto-warn the user (calls `addWarning`, checks thresholds)
4. Log to automod log channel

## Warn Escalation Flow

When `addWarning` is called (manually via `/warn` or automatically via auto-mod):

1. Insert warning into DB
2. Count total warnings for that user in that guild
3. Compare against thresholds (check highest first):
   - If `warnBanThreshold` is set and count >= threshold → ban the user
   - Else if `warnKickThreshold` is set and count >= threshold → kick the user
   - Else if `warnMuteThreshold` is set and count >= threshold → timeout the user for `muteDuration` minutes
4. Log the original warn + any auto-escalation action to mod log channel

## Intents

No new intents needed. `GuildMessages` and `MessageContent` (already enabled for AI chat) cover auto-mod. `Guilds` covers member actions.

The bot does need the `ModerateMembers` permission for timeouts. Update the invite URL permission integer to include: `Administrator` (already has it via `permissions=8`).

## File Structure

```
src/commands/
  moderation/
    kick.ts
    ban.ts
    unban.ts
    warn.ts
    warnings.ts
    clearwarnings.ts
  admin/
    automod.ts          (subcommands: set, config, status)
    bannedwords.ts      (subcommands: add, remove, list)
    warnconfig.ts       (subcommands: set, status, mute-duration)
    setlogchannel.ts
    removelogchannel.ts
    setchannel.ts       (existing)
    removechannel.ts    (existing)
    listchannels.ts     (existing)
src/services/
  moderation.ts         (guild config, warnings, banned words CRUD)
  modlog.ts             (log embed helper)
  database.ts           (existing)
  gemini.ts             (existing)
  settings.ts           (existing)
src/events/
  messageCreate.ts      (extended with auto-mod checks)
  interactionCreate.ts  (existing)
  ready.ts              (existing)
```

## Error Handling

- All mod commands: try/catch, ephemeral error reply
- Permission errors (can't kick someone higher role): catch DiscordAPIError, reply with clear message
- Auto-mod message delete failures (message already deleted): silently ignore
- DB errors in auto-mod: log to console, don't crash — auto-mod is best-effort
