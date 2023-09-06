import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, container } from '@sapphire/framework';
import type { Message, MessageReaction, Typing, User } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate, name: 'ActivityUpdater.MessageCreate' })
export class MessageCreate extends Listener<typeof Events.MessageCreate> {
	public async run(message: Message) {
		if (!message.inGuild()) {
			return;
		}

		await updateStateForUserInChannel(message.author.id, message.channelId, message.guildId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate, name: 'ActivityUpdater.MessageUpdate' })
export class MessageUpdate extends Listener<typeof Events.MessageUpdate> {
	public async run(_: Message, message: Message) {
		if (!message.inGuild()) {
			return;
		}

		await updateStateForUserInChannel(message.author.id, message.channelId, message.guildId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.MessageReactionAdd, name: 'ActivityUpdater.MessageReactionAdd' })
export class MessageReactionAdd extends Listener<typeof Events.MessageReactionAdd> {
	public async run(reaction: MessageReaction, user: User) {
		if (!reaction.message.inGuild()) {
			return;
		}

		await updateStateForUserInChannel(user.id, reaction.message.channelId, reaction.message.guildId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.MessageReactionRemove, name: 'ActivityUpdater.MessageReactionRemove' })
export class MessageReactionRemove extends Listener<typeof Events.MessageReactionRemove> {
	public async run(reaction: MessageReaction, user: User) {
		if (!reaction.message.inGuild()) {
			return;
		}

		await updateStateForUserInChannel(user.id, reaction.message.channelId, reaction.message.guildId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.TypingStart, name: 'ActivityUpdater.TypingStart' })
export class TypingStart extends Listener<typeof Events.TypingStart> {
	public async run(typingData: Typing) {
		if (!typingData.inGuild()) {
			return;
		}

		await updateStateForUserInChannel(typingData.user.id, typingData.channel.id, typingData.guild.id);
	}
}

async function updateStateForUserInChannel(userId: string, channelId: string, guildId: string) {
	// First check if the user has a grace period set
	const user = await container.prisma.user.findFirst({
		where: { id: userId, gracePeriod: { not: null } },
	});

	if (!user) {
		return;
	}

	// Could it be on one line? Absolutely!
	// Is it? No, because it looks pretty when logging it for debug purposes :)
	await container.prisma.$executeRaw`
	INSERT INTO user_activities (user_id, channel_id, guild_id, last_active_at)
	VALUES (${userId}, ${channelId}, ${guildId}, NOW())
	ON CONFLICT (user_id, channel_id) DO
		UPDATE SET last_active_at = NOW()
`; // We love indentations >.>
}
