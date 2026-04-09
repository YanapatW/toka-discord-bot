# Phase 3: Utility — Design Spec

## Goal

Add utility features to ToKa: polls with button voting, self-assignable roles, timed reminders, and server/user info commands.

## Database Schema

### Poll

One row per poll. Tracks the message ID so button interactions can find the poll.

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
```

### PollOption

Options for a poll. Position determines display order.

```prisma
model PollOption {
  id       Int    @id @default(autoincrement())
  pollId   Int    @map("poll_id")
  label    String
  position Int

  poll  Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes PollVote[]

  @@map("poll_options")
}
```

### PollVote

One vote per user per poll. Changing vote updates the optionId.

```prisma
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
```

### SelfAssignableRole

Per-server list of roles users can self-assign.

```prisma
model SelfAssignableRole {
  id      Int    @id @default(autoincrement())
  guildId String @map("guild_id")
  roleId  String @map("role_id")

  @@unique([guildId, roleId])
  @@map("self_assignable_roles")
}
```

### Reminder

Stored reminders. `fired` marks completed ones to avoid re-sending.

```prisma
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

## Commands

### Poll (`src/commands/utility/poll.ts`)

No special permission required. Any user can create a poll.

| Command | Options | Behavior |
|---|---|---|
| `/poll` | `question` (string, required), `option1` through `option10` (string, option1-2 required, 3-10 optional) | Create a poll embed with buttons. Each button labeled with option text. Stores poll + options in DB. Adds an "End Poll" button visible only to creator. |

**Button interaction handling:** In a new event handler or in `interactionCreate.ts`:
- On button click: upsert vote (one per user per poll), update embed with new counts
- On "End Poll" click: set `active = false`, disable all buttons, show final results

**Embed format:**
- Title: poll question
- Description: numbered list of options with vote counts and percentage bars
- Footer: "Vote by clicking a button below" or "Poll ended — final results"
- Color: 0x5865F2 (Discord blurple)

### Self-Assign Roles (`src/commands/utility/role.ts`)

Uses subcommands. `setup` and `unsetup` require `Administrator`. `add`, `remove`, `list` are available to everyone.

| Subcommand | Options | Behavior |
|---|---|---|
| `/role add` | `role` (role, required) | Assign the role to yourself. Must be in the self-assignable list. |
| `/role remove` | `role` (role, required) | Remove the role from yourself. Must be in the self-assignable list. |
| `/role list` | none | Show all self-assignable roles for this server (ephemeral) |
| `/role setup` | `role` (role, required) | Admin: add a role to the self-assignable list |
| `/role unsetup` | `role` (role, required) | Admin: remove a role from the self-assignable list |

**Validation:**
- `/role add`: check role is in the self-assignable list, check bot has permission to assign it (role hierarchy)
- `/role setup`: prevent adding @everyone or roles higher than the bot's role

### Reminders (`src/commands/utility/remind.ts`, `src/commands/utility/reminders.ts`)

No special permission required.

| Command | Options | Behavior |
|---|---|---|
| `/remind` | `time` (string, required, e.g. "30m", "2h", "1d"), `message` (string, required) | Parse time, calculate `remindAt`, store in DB, confirm with ephemeral reply showing when it will fire |
| `/reminders` | none | List your active (unfired) reminders for this server (ephemeral) |
| `/cancelreminder` | `id` (integer, required) | Cancel a reminder by ID. Must be your own reminder. |

**Time parsing:** Simple regex matching `(\d+)(m|h|d)`:
- `m` = minutes, `h` = hours, `d` = days
- Max: 30 days
- Examples: `30m`, `2h`, `1d`, `7d`

### Server Info (`src/commands/utility/serverinfo.ts`)

No special permission required.

| Command | Options | Behavior |
|---|---|---|
| `/serverinfo` | none | Embed with: server name, icon, owner, member count, creation date, boost level |

**Embed fields:**
- Server Name (title)
- Owner
- Members (total)
- Created (relative timestamp)
- Boost Level + boost count
- Server icon as thumbnail

### User Info (`src/commands/utility/userinfo.ts`)

No special permission required.

| Command | Options | Behavior |
|---|---|---|
| `/userinfo` | `user` (user, optional — defaults to self) | Embed with: username, avatar, account creation date, server join date, roles, warning count |

**Embed fields:**
- Username + avatar as thumbnail
- Account Created (relative timestamp)
- Joined Server (relative timestamp)
- Roles (list, max 20)
- Warnings (count from Phase 2 `Warning` table)

## Services

### `src/services/poll.ts`

- `createPoll(guildId, channelId, messageId, creatorId, question, options: string[])` — create poll + options in a transaction
- `vote(pollId, userId, optionId)` — upsert vote
- `getPollResults(pollId)` — return poll with options and vote counts
- `endPoll(pollId)` — set active = false

### `src/services/roles.ts`

- `addSelfAssignableRole(guildId, roleId)` — add, return boolean
- `removeSelfAssignableRole(guildId, roleId)` — remove, return boolean
- `getSelfAssignableRoles(guildId)` — return roleId string[]
- `isSelfAssignable(guildId, roleId)` — check if role is in the list

### `src/services/reminder.ts`

- `createReminder(guildId, channelId, userId, message, remindAt)` — insert
- `getUserReminders(guildId, userId)` — list active reminders
- `cancelReminder(id, userId)` — delete if owned by user, return boolean
- `getDueReminders()` — find all unfired reminders where `remindAt <= now`
- `markFired(id)` — set fired = true

## Reminder Scheduler

In `src/index.ts`, after `client.login()`:

```typescript
setInterval(async () => {
  const due = await getDueReminders();
  for (const reminder of due) {
    try {
      const channel = await client.channels.fetch(reminder.channelId);
      if (channel?.isTextBased()) {
        await channel.send(`<@${reminder.userId}> Reminder: ${reminder.message}`);
      }
      await markFired(reminder.id);
    } catch (error) {
      console.error(`Reminder ${reminder.id} failed:`, error);
      await markFired(reminder.id); // Mark fired even on error to avoid infinite retries
    }
  }
}, 30_000);
```

## Button Interaction Handling

Extend `src/events/interactionCreate.ts` to handle button clicks:

```typescript
if (interaction.isButton()) {
  // Route to poll handler based on customId prefix
  if (interaction.customId.startsWith("poll_vote_")) {
    // handle vote
  } else if (interaction.customId.startsWith("poll_end_")) {
    // handle end poll
  }
}
```

**Button customId format:**
- Vote buttons: `poll_vote_{pollId}_{optionId}`
- End button: `poll_end_{pollId}`

## File Structure

```
src/commands/utility/
  poll.ts
  role.ts
  remind.ts
  reminders.ts
  cancelreminder.ts
  serverinfo.ts
  userinfo.ts
src/services/
  poll.ts
  roles.ts
  reminder.ts
src/events/
  interactionCreate.ts    (modified — add button handler)
src/index.ts              (modified — add reminder scheduler)
```

## Error Handling

- Poll button clicks on ended polls: reply ephemeral "This poll has ended"
- Role assignment failures (hierarchy): reply with clear error
- Reminder time parsing failures: reply with format examples
- Reminder scheduler errors: log and mark fired to prevent loops
- All commands: try/catch with ephemeral error replies
