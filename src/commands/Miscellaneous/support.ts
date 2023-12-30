import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { ButtonBuilder, Message } from 'discord.js';
import { ActionRowBuilder, italic } from 'discord.js';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { SupportServerButton } from '#utils/misc';

@ApplyOptions<Command.Options>({
	description: 'Get a link to the support server for this application',
})
export class SupportCommand extends Command {
	public override async messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		return this._sharedRun(interaction, false);
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((support) => support.setName(this.name).setDescription(this.description));
	}

	protected async _sharedRun(
		messageOrInteraction: Command.ChatInputCommandInteraction | Message,
		isMessage: boolean,
	) {
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
