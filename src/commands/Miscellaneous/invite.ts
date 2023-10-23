import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { InviteButton } from '#utils/misc';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, Message, hyperlink } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Get a link with which you can invite the application to your server',
})
export class InviteCommand extends Command {
	public override messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override chatInputRun(interaction: Command.ChatInputCommandInteraction<'cached'>) {
		return this._sharedRun(interaction, false);
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((invite) => invite.setName(this.name).setDescription(this.description));
	}

	protected async _sharedRun(
		messageOrInteraction: Message | Command.ChatInputCommandInteraction<'cached'>,
		isMessage: boolean,
	) {
		const embed = createInfoEmbed(
			[
				'Click the button below to add me to your server! 😄 🎉',
				'',
				`If that didn't work, try clicking ${hyperlink('here', this.container.clientInvite)} instead.`,
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
					components: [new ActionRowBuilder<ButtonBuilder>().setComponents(InviteButton)],
				},
			}),
		);
	}
}
