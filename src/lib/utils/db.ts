import { container } from '@sapphire/framework';
import type { Member } from '#generated/prisma/client';
import { ensureUser, getMemberIgnores, upsertMember } from '#generated/prisma/sql';

export interface FullMember extends Member {
	ignoredChannels: string[];
	ignoredUsers: string[];
}

export async function getDatabaseMember(guildId: string, userId: string): Promise<FullMember> {
	const [_, [rawMember], [rawIgnored]] = await container.prisma.$transaction([
		container.prisma.$queryRawTyped(ensureUser(userId)),
		container.prisma.$queryRawTyped(upsertMember(guildId, userId)),
		container.prisma.$queryRawTyped(getMemberIgnores(userId, guildId)),
	]);

	let ignoredUsers: string[] = [];
	let ignoredChannels: string[] = [];

	if (rawIgnored.ignored_users?.[0]) {
		ignoredUsers = rawIgnored.ignored_users;
	}

	if (rawIgnored.ignored_channels?.[0]) {
		ignoredChannels = rawIgnored.ignored_channels;
	}

	return {
		guildId: rawMember.guild_id!,
		userId: rawMember.user_id!,
		regularExpressions: rawMember.regular_expressions ?? [],
		ignoredUsers,
		ignoredChannels,
	};
}

export async function getDatabaseUser(userId: string) {
	return container.prisma.user.upsert({
		where: { id: userId },
		create: { id: userId },
		update: {},
		include: { globallyIgnoredUsers: true },
	});
}
