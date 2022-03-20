import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { italic } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Message, MessageActionRow, MessageButton } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Gives you a link to the support server for this application',
	chatInputCommand: {
		register: true,
		guildIds: useDevelopmentGuildIds(),
		idHints: [
			// HighlightDev - Sapphire Guild Command
			'950164487057580073',
		],
	},
})
export class SupportCommand extends Command {
	public override messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override chatInputRun(interaction: Command.ChatInputInteraction) {
		return this._sharedRun(interaction, false);
	}

	protected async _sharedRun(messageOrInteraction: Message | Command.ChatInputInteraction, isMessage: boolean) {
		const embed = createInfoEmbed(
			[
				italic("It's dangerous to go alone if you are lost..."),
				"We're here to help you if you need help using Highlight! Just click the button below to join the support server!",
			].join('\n'),
		);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					embeds: [embed],
					ephemeral: true,
					components: [
						new MessageActionRow().addComponents(
							new MessageButton()
								.setStyle('LINK')
								.setURL(process.env.SUPPORT_SERVER_INVITE ?? 'https://discord.gg/C6D9bge')
								.setLabel('Support server')
								.setEmoji('🆘'),
						),
					],
				},
			}),
		);
	}
}
