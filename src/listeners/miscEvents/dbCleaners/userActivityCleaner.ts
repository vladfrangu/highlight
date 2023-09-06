import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel, DMChannel, Guild, NonThreadGuildBasedChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: 'UserActivity.ChannelDelete' })
export class ChannelDelete extends Listener<typeof Events.ChannelDelete> {
	public async run(channel: DMChannel | NonThreadGuildBasedChannel) {
		if (channel.isDMBased()) {
			return;
		}

		// Delete all user activities for this channel
		await this.container.prisma.userActivity.deleteMany({ where: { channelId: channel.id } });
	}
}

@ApplyOptions<Listener.Options>({ event: Events.GuildDelete, name: 'UserActivity.GuildDelete' })
export class GuildDelete extends Listener<typeof Events.GuildDelete> {
	public async run(guild: Guild) {
		// Delete all user activities for this guild
		await this.container.prisma.userActivity.deleteMany({ where: { guildId: guild.id } });
	}
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: 'UserActivity.ThreadDelete' })
export class ThreadDelete extends Listener<typeof Events.ThreadDelete> {
	public async run(thread: AnyThreadChannel) {
		// Delete all user activities for this thread
		await this.container.prisma.userActivity.deleteMany({ where: { channelId: thread.id } });
	}
}
