import { GuildMember, escapeMarkdown, type User } from 'discord.js';

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
