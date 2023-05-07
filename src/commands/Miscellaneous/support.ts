import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { SupportServerButton } from '#utils/misc';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, Message, italic } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Get a link to the support server for this application',
})
export class SupportCommand extends Command {
	public override messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		return this._sharedRun(interaction, false);
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((support) => support.setName(this.name).setDescription(this.description), {
			guildIds: useDevelopmentGuildIds(),
			idHints: [
				// HighlightDev - Sapphire Guild Command
				'950164487057580073',
			],
		});
	}

	protected async _sharedRun(messageOrInteraction: Message | Command.ChatInputCommandInteraction, isMessage: boolean) {
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
					components: [new ActionRowBuilder<ButtonBuilder>().setComponents(SupportServerButton)],
				},
			}),
		);
	}
}
