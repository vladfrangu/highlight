import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, container } from '@sapphire/framework';
import type { Message, MessageReaction, Typing, User } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate, name: 'ActivityUpdater.MessageCreate' })
export class MessageCreate extends Listener<typeof Events.MessageCreate> {
	public async run(message: Message) {
		await updateStateForUserInChannel(message.author.id, message.channelId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate, name: 'ActivityUpdater.MessageUpdate' })
export class MessageUpdate extends Listener<typeof Events.MessageUpdate> {
	public async run(_: Message, message: Message) {
		await updateStateForUserInChannel(message.author.id, message.channelId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.MessageReactionAdd, name: 'ActivityUpdater.MessageReactionAdd' })
export class MessageReactionAdd extends Listener<typeof Events.MessageReactionAdd> {
	public async run(reaction: MessageReaction, user: User) {
		await updateStateForUserInChannel(user.id, reaction.message.channelId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.MessageReactionRemove, name: 'ActivityUpdater.MessageReactionRemove' })
export class MessageReactionRemove extends Listener<typeof Events.MessageReactionRemove> {
	public async run(reaction: MessageReaction, user: User) {
		await updateStateForUserInChannel(user.id, reaction.message.channelId);
	}
}

@ApplyOptions<Listener.Options>({ event: Events.TypingStart, name: 'ActivityUpdater.TypingStart' })
export class TypingStart extends Listener<typeof Events.TypingStart> {
	public async run(typingData: Typing) {
		await updateStateForUserInChannel(typingData.user.id, typingData.channel.id);
	}
}

async function updateStateForUserInChannel(userId: string, channelId: string) {
	// First check if the user has a grace period set
	const user = await container.prisma.user.findFirst({
		where: { id: userId, gracePeriod: { not: null } },
	});

	if (!user) {
		return;
	}

	await container.prisma.userActivity.upsert({
		where: { userId_channelId: { userId, channelId } },
		create: {
			channelId,
			user: {
				connectOrCreate: {
					where: { id: userId },
					create: { id: userId },
				},
			},
			lastActiveAt: new Date(),
		},
		update: {
			lastActiveAt: new Date(),
		},
	});
}
