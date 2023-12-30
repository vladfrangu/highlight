import type { Member } from '@prisma/client';
import { container } from '@sapphire/framework';

interface RawMember {
	guild_id: string;
	regular_expressions: string[] | null;
	user_id: string;
	words: string[] | null;
}

interface RawIgnored {
	ignored_channels: null[] | string[] | null;
	ignored_users: null[] | string[] | null;
}

export interface FullMember extends Member {
	ignoredChannels: string[];
	ignoredUsers: string[];
}

export async function getDatabaseMember(guildId: string, userId: string): Promise<FullMember> {
	const [_, [rawMember], [rawIgnored]] = await container.prisma.$transaction([
		container.prisma.$queryRaw`INSERT INTO users (id) VALUES (${userId}) ON CONFLICT (id) DO NOTHING`,
		container.prisma.$queryRaw<[RawMember]>`
	INSERT INTO members (guild_id, user_id)
	VALUES (${guildId}, ${userId})
	ON CONFLICT (guild_id, user_id) DO
		UPDATE SET user_id = ${userId}
	RETURNING *
`,
		container.prisma.$queryRaw<[RawIgnored]>`
	SELECT
		array_agg(guild_ignored_channels.ignored_channel_id) as ignored_channels,
		array_agg(guild_ignored_users.ignored_user_id) as ignored_users
	FROM guild_ignored_channels
	LEFT JOIN guild_ignored_users ON
		guild_ignored_users.user_id = guild_ignored_channels.user_id
		AND guild_ignored_users.guild_id = guild_ignored_channels.guild_id
	WHERE
		guild_ignored_channels.user_id = ${userId}
		AND guild_ignored_channels.guild_id = ${guildId}
`,
	]);

	let ignoredUsers: string[] = [];
	let ignoredChannels: string[] = [];

	if (rawIgnored.ignored_users?.[0] !== null) {
		ignoredUsers = rawIgnored.ignored_users as string[];
	}

	if (rawIgnored.ignored_channels?.[0] !== null) {
		ignoredChannels = rawIgnored.ignored_channels as string[];
	}

	return {
		guildId: rawMember.guild_id,
		userId: rawMember.user_id,
		words: rawMember.words ?? [],
		regularExpressions: rawMember.regular_expressions ?? [],
		ignoredUsers,
		ignoredChannels,
	};
}
