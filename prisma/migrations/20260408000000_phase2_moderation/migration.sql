-- CreateTable
CREATE TABLE "guild_config" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "mod_log_channel_id" TEXT,
    "automod_log_channel_id" TEXT,
    "automod_banned_words" BOOLEAN NOT NULL DEFAULT false,
    "automod_spam" BOOLEAN NOT NULL DEFAULT false,
    "automod_links" BOOLEAN NOT NULL DEFAULT false,
    "automod_mass_mentions" BOOLEAN NOT NULL DEFAULT false,
    "spam_max_messages" INTEGER NOT NULL DEFAULT 5,
    "spam_interval" INTEGER NOT NULL DEFAULT 10,
    "mass_mention_limit" INTEGER NOT NULL DEFAULT 5,
    "warn_mute_threshold" INTEGER,
    "warn_kick_threshold" INTEGER,
    "warn_ban_threshold" INTEGER,
    "mute_duration" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warnings" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_words" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,

    CONSTRAINT "banned_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_roles" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "command_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guild_config_guild_id_key" ON "guild_config"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "banned_words_guild_id_word_key" ON "banned_words"("guild_id", "word");

-- CreateIndex
CREATE UNIQUE INDEX "command_roles_guild_id_command_role_id_key" ON "command_roles"("guild_id", "command", "role_id");
