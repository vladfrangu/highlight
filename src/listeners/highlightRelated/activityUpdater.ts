/* eslint-disable @neon/eslint-sonarjs/no-identical-functions */

import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, container } from '@sapphire/framework';
import type { Message, MessageReaction, Typing, User } from 'discord.js';
import { upsertUserActivity } from '#generated/prisma/sql';

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
	public async run(_: never, message: Message) {
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
	// First check if the user has a grace period set, and hasn't opted out
	const user = await container.prisma.user.findFirst({
		where: { id: userId, gracePeriod: { not: null }, optedOut: false },
	});

	if (!user) {
		return;
	}

	await container.prisma.$queryRawTyped(upsertUserActivity(userId, channelId, guildId));
}
