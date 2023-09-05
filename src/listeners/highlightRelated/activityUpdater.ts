import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, container } from '@sapphire/framework';
import type {
	AnyThreadChannel,
	DMChannel,
	Guild,
	Message,
	MessageReaction,
	NonThreadGuildBasedChannel,
	Typing,
	User,
} from 'discord.js';

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

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: 'ActivityUpdater.ChannelDelete' })
export class ChannelDelete extends Listener<typeof Events.ChannelDelete> {
	public async run(channel: DMChannel | NonThreadGuildBasedChannel) {
		if (channel.isDMBased()) {
			return;
		}

		// Delete all user activities for this channel
		await container.prisma.userActivity.deleteMany({ where: { channelId: channel.id } });
	}
}

@ApplyOptions<Listener.Options>({ event: Events.GuildDelete, name: 'ActivityUpdater.GuildDelete' })
export class GuildDelete extends Listener<typeof Events.GuildDelete> {
	public async run(guild: Guild) {
		// Delete all user activities for this guild
		await container.prisma.userActivity.deleteMany({ where: { guildId: guild.id } });
	}
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: 'ActivityUpdater.ThreadDelete' })
export class ThreadDelete extends Listener<typeof Events.ThreadDelete> {
	public async run(thread: AnyThreadChannel) {
		// Delete all user activities for this thread
		await container.prisma.userActivity.deleteMany({ where: { channelId: thread.id } });
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
