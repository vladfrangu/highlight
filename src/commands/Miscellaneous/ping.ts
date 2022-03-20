import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { bold } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Find out if Highlight is alive and processing messages!',
	chatInputCommand: {
		register: true,
		guildIds: useDevelopmentGuildIds(),
		idHints: [
			// HighlightDev - Sapphire Guild Command
			'950159487006818314',
		],
	},
})
export class PingCommand extends Command {
	public override messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override chatInputRun(interaction: Command.ChatInputInteraction<'cached'>) {
		return this._sharedRun(interaction);
	}

	protected async _sharedRun(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		isMessage = false,
	) {
		const diffFromDiscordToUs = Date.now() - messageOrInteraction.createdTimestamp;

		const preGivingResponse = Date.now();

		const response = await messageOrInteraction.reply({
			embeds: [createInfoEmbed('Ping? 👀')],
			fetchReply: true,
			ephemeral: true,
		});

		const delayFromUsToDiscord = Date.now() - preGivingResponse;

		const embed = createInfoEmbed(
			[
				"Your ping has been pong'd! 🏓",
				`🐌 Latency: `,
				`${bold('┝')} Discord -> Highlight: ${bold(`${diffFromDiscordToUs}ms`)}`,
				`${bold('┝')} Highlight -> Discord: ${bold(`${delayFromUsToDiscord}ms`)}`,
				`${bold('┗')} Total: ${bold(`${diffFromDiscordToUs + delayFromUsToDiscord}ms`)}`,
				`💓 Gateway heartbeat: ${bold(`${response.client.ws.ping}ms`)}`,
			].join('\n'),
		);

		const newOptions = withDeprecationWarningForMessageCommands({
			commandName: this.name,
			guildId: messageOrInteraction.guildId,
			receivedFromMessage: isMessage,
			options: {
				embeds: [embed],
			},
		});

		if (isMessage) {
			await response.edit(newOptions);
		} else {
			await (messageOrInteraction as Command.ChatInputInteraction<'cached'>).editReply(newOptions);
		}
	}
}
