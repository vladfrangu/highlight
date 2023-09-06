import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel, DMChannel, NonThreadGuildBasedChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: 'ChannelWithBotParsing.ChannelDelete' })
export class ChannelDelete extends Listener<typeof Events.ChannelDelete> {
	public async run(channel: DMChannel | NonThreadGuildBasedChannel) {
		if (channel.isDMBased()) {
			return;
		}

		// Delete any possible channel with bot parsing for this channel
		await this.container.prisma.channelWithBotParsing.delete({ where: { channelId: channel.id } });
	}
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: 'ChannelWithBotParsing.ThreadDelete' })
export class ThreadDelete extends Listener<typeof Events.ThreadDelete> {
	public async run(thread: AnyThreadChannel) {
		// Delete any possible channel with bot parsing for this thread
		await this.container.prisma.channelWithBotParsing.delete({ where: { channelId: thread.id } });
	}
}
