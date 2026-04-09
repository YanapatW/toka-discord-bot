# Phase 4: Fun — Design Spec

## Goal

Add fun features to ToKa: mini-games (coinflip, dice, rps, 8ball, trivia), economy system (daily, work, steal, gambling, shop, inventory), and meme commands (Reddit + imgflip generator).

## Database Schema

### UserEconomy

One row per user per guild. Tracks balance and cooldowns.

```prisma
model UserEconomy {
  id        Int      @id @default(autoincrement())
  guildId   String   @map("guild_id")
  userId    String   @map("user_id")
  balance   Int      @default(0)
  lastDaily DateTime? @map("last_daily")
  lastWork  DateTime? @map("last_work")
  lastSteal DateTime? @map("last_steal")

  @@unique([guildId, userId])
  @@map("user_economy")
}
```

### ShopItem

Per-server shop items created by admins. Optional roleId grants a role on purchase.

```prisma
model ShopItem {
  id          Int     @id @default(autoincrement())
  guildId     String  @map("guild_id")
  name        String
  description String
  price       Int
  roleId      String? @map("role_id")

  @@map("shop_items")
}
```

### UserInventory

Items a user has purchased.

```prisma
model UserInventory {
  id     Int    @id @default(autoincrement())
  guildId String @map("guild_id")
  userId String @map("user_id")
  itemId Int    @map("item_id")

  @@map("user_inventory")
}
```

### TriviaQuestion

Admin-created trivia questions per server.

```prisma
model TriviaQuestion {
  id            Int    @id @default(autoincrement())
  guildId       String @map("guild_id")
  question      String
  correctAnswer String @map("correct_answer")
  wrongAnswers  String @map("wrong_answers")
  creatorId     String @map("creator_id")

  @@map("trivia_questions")
}
```

Note: `wrongAnswers` stores JSON array as a string (e.g. `["wrong1","wrong2","wrong3"]`).

## Commands

### Mini-games (`src/commands/fun/`)

| Command | Options | Behavior |
|---|---|---|
| `/coinflip` | none | Random heads or tails embed |
| `/dice` | `sides` (int, optional, default 6, min 2, max 100) | Roll result embed |
| `/rps` | `choice` (choice: rock, paper, scissors) | Bot picks random, show winner |
| `/8ball` | `question` (string, required) | Random 8-ball response |
| `/trivia` | none | Fetch from Open Trivia DB, show question with 4 answer buttons, 15s timeout |
| `/trivia-custom` | none | Random question from admin-created pool, same button format |
| `/trivia-add` | `question`, `correct`, `wrong1`, `wrong2`, `wrong3` (all strings, required) | Admin: add custom trivia question. Requires Administrator. |

### Economy (`src/commands/economy/`)

| Command | Options | Behavior |
|---|---|---|
| `/daily` | none | Claim 100 coins, 24h cooldown |
| `/balance` | `user` (optional) | Show balance |
| `/give` | `user`, `amount` (int, min 1) | Transfer coins, must have enough |
| `/leaderboard` | none | Top 10 richest in server |
| `/work` | none | Earn 10-50 random coins, 1h cooldown |
| `/steal` | `user` | 40% success: steal 10-30% of target. 60% fail: lose 10% of your own. 2h cooldown. |
| `/slots` | `bet` (int, min 1) | 3 random emoji, payouts: 3 match = 10x, 2 match = 2x, 0 match = lose bet |
| `/blackjack` | `bet` (int, min 1) | Deal cards, Hit/Stand buttons. Beat dealer = 2x, blackjack = 2.5x, bust/lose = lose bet |
| `/shop` | subcommand: list | Show all shop items |
| `/shop` | subcommand: buy, `item` (string) | Buy item, deduct price, add to inventory, grant role if item has one |
| `/shop` | subcommand: create, `name`, `price` (int), `description`, `role` (optional) | Admin: create shop item |
| `/shop` | subcommand: delete, `name` | Admin: delete shop item |
| `/inventory` | none | Show your purchased items |

### Memes (`src/commands/fun/`)

| Command | Options | Behavior |
|---|---|---|
| `/meme` | none | Fetch random meme from Reddit (r/memes, r/dankmemes, r/ProgrammerHumor) |
| `/meme-create` | `template` (string), `top` (string), `bottom` (string) | Generate meme via imgflip API |

Note: imgflip requires free API credentials (username + password). Store as optional env vars `IMGFLIP_USERNAME` and `IMGFLIP_PASSWORD`. If not set, `/meme-create` replies with "Meme generator not configured."

## Services

### `src/services/economy.ts`
- `getBalance(guildId, userId)` — return balance (upsert with 0)
- `addCoins(guildId, userId, amount)` — add coins
- `removeCoins(guildId, userId, amount)` — remove coins, return false if insufficient
- `transferCoins(guildId, fromUserId, toUserId, amount)` — atomic transfer
- `getLeaderboard(guildId, limit)` — top N by balance
- `claimDaily(guildId, userId)` — check 24h cooldown, add 100 coins, return { success, nextClaim }
- `claimWork(guildId, userId)` — check 1h cooldown, add 10-50 coins, return { success, amount, nextWork }
- `attemptSteal(guildId, userId, targetId)` — check 2h cooldown, 40/60 logic, return result

### `src/services/shop.ts`
- `createItem(guildId, name, description, price, roleId?)` — create
- `deleteItem(guildId, name)` — delete, return boolean
- `getItems(guildId)` — list all
- `buyItem(guildId, userId, itemName)` — check balance, deduct, add to inventory, return { success, item }
- `getInventory(guildId, userId)` — list user's items

### `src/services/trivia.ts`
- `fetchTriviaQuestion()` — GET from opentdb.com API, return formatted question
- `addCustomQuestion(guildId, creatorId, question, correct, wrong[])` — insert
- `getRandomCustomQuestion(guildId)` — random from pool

### `src/services/meme.ts`
- `fetchRedditMeme()` — GET random post from meme subreddits via Reddit JSON API
- `generateMeme(template, topText, bottomText)` — POST to imgflip API

## Button Handlers

### Trivia buttons
- customId: `trivia_{correct|wrong}_{index}`
- On click: show if correct/wrong, disable all buttons, show correct answer
- 15s timeout: auto-disable buttons, show "Time's up"

### Blackjack buttons
- customId: `bj_hit_{oddsId}` / `bj_stand_{oddsId}`
- Track game state in memory (Map of oddsId → game state)
- Hit: draw card, check bust. Stand: dealer plays, compare hands.

## Environment Variables

Add to `.env.example`:
```
IMGFLIP_USERNAME=
IMGFLIP_PASSWORD=
```

Both optional. `/meme-create` disabled if not set.

## File Structure

```
src/commands/
  fun/
    coinflip.ts
    dice.ts
    rps.ts
    8ball.ts
    trivia.ts
    trivia-custom.ts
    trivia-add.ts
    meme.ts
    meme-create.ts
  economy/
    daily.ts
    balance.ts
    give.ts
    leaderboard.ts
    work.ts
    steal.ts
    slots.ts
    blackjack.ts
    shop.ts
    inventory.ts
src/services/
  economy.ts
  shop.ts
  trivia.ts
  meme.ts
```
