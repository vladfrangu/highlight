import { container } from '@sapphire/framework';
import { Time } from '@sapphire/timestamp';
import { GuildMember, escapeMarkdown, type User } from 'discord.js';
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, { bot: boolean; displayTag: string }>({
	max: 1_000_000,
	ttl: Time.Hour * 12,
	updateAgeOnGet: true,
	allowStale: false,
	async fetchMethod(key) {
		const user = await container.client.users.fetch(key).catch(() => null);

		if (!user) {
			return {
				bot: false,
				displayTag: `Unknown User (${key})`,
			};
		}

		return {
			bot: user.bot,
			displayTag: getUserTag(user),
		};
	},
});

export function getUserTag(userOrMember: GuildMember | User) {
	if (userOrMember instanceof GuildMember) {
		return getUserTag(userOrMember.user);
	}

	const escapedDisplayName = escapeMarkdown(userOrMember.displayName);
	const escapedUsername = escapeMarkdown(userOrMember.username);
	const pomelo = userOrMember.discriminator === '0';

	if (pomelo) {
		return `${escapedDisplayName} (@${escapedUsername})`;
	}

	return `${escapedDisplayName} (${escapedUsername}#${userOrMember.discriminator})`;
}

export const UnknownUserTag = 'A Discord User';

export async function fetchUserTag(id: string) {
	return cache.fetch(id);
}
