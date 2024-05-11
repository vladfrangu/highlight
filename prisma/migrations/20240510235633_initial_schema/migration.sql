-- CreateEnum
CREATE TYPE "GuildNotificationStyle" AS ENUM ('WITH_CONTEXT_AND_AUTHOR', 'WITH_CONTEXT_BUT_NO_AUTHOR', 'WITHOUT_CONTEXT_BUT_WITH_AUTHOR', 'WITHOUT_CONTEXT_OR_AUTHOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "opted_out" BOOLEAN NOT NULL DEFAULT false,
    "opted_out_at" TIMESTAMP(3),
    "grace_period" INTEGER,
    "adult_channel_highlights" BOOLEAN NOT NULL DEFAULT false,
    "direct_message_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "direct_message_cooldown_expires_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_ignored_users" (
    "user_id" TEXT NOT NULL,
    "ignored_user_id" TEXT NOT NULL,

    CONSTRAINT "global_ignored_users_pkey" PRIMARY KEY ("user_id","ignored_user_id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "guild_id" TEXT NOT NULL,
    "notification_style" "GuildNotificationStyle" NOT NULL DEFAULT 'WITH_CONTEXT_AND_AUTHOR',
    "channel_with_bot_parsings_allowed" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "channels_with_bot_parsing" (
    "channel_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_with_bot_parsing_pkey" PRIMARY KEY ("channel_id")
);

-- CreateTable
CREATE TABLE "members" (
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "words" TEXT[],
    "regular_expressions" TEXT[],

    CONSTRAINT "members_pkey" PRIMARY KEY ("guild_id","user_id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "last_active_at" TIMESTAMP NOT NULL,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("user_id","channel_id")
);

-- CreateTable
CREATE TABLE "guild_ignored_channels" (
    "ignored_channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,

    CONSTRAINT "guild_ignored_channels_pkey" PRIMARY KEY ("guild_id","user_id","ignored_channel_id")
);

-- CreateTable
CREATE TABLE "guild_ignored_users" (
    "ignored_user_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,

    CONSTRAINT "guild_ignored_users_pkey" PRIMARY KEY ("guild_id","user_id","ignored_user_id")
);

-- CreateIndex
CREATE INDEX "global_ignored_users_user_id_idx" ON "global_ignored_users"("user_id");

-- CreateIndex
CREATE INDEX "members_guild_id_idx" ON "members"("guild_id");

-- CreateIndex
CREATE INDEX "guild_ignored_channels_user_id_guild_id_idx" ON "guild_ignored_channels"("user_id", "guild_id");

-- CreateIndex
CREATE INDEX "guild_ignored_channels_guild_id_idx" ON "guild_ignored_channels"("guild_id");

-- CreateIndex
CREATE INDEX "guild_ignored_users_user_id_guild_id_idx" ON "guild_ignored_users"("user_id", "guild_id");

-- CreateIndex
CREATE INDEX "guild_ignored_users_guild_id_idx" ON "guild_ignored_users"("guild_id");

-- AddForeignKey
ALTER TABLE "global_ignored_users" ADD CONSTRAINT "global_ignored_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels_with_bot_parsing" ADD CONSTRAINT "channels_with_bot_parsing_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_ignored_channels" ADD CONSTRAINT "guild_ignored_channels_guild_id_user_id_fkey" FOREIGN KEY ("guild_id", "user_id") REFERENCES "members"("guild_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_ignored_users" ADD CONSTRAINT "guild_ignored_users_guild_id_user_id_fkey" FOREIGN KEY ("guild_id", "user_id") REFERENCES "members"("guild_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
