import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Message,
	OAuth2Scopes,
	PermissionFlagsBits,
	PermissionsBitField,
} from 'discord.js';

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
		registry.registerChatInputCommand((invite) => invite.setName(this.name).setDescription(this.description), {
			guildIds: useDevelopmentGuildIds(),
			idHints: [
				// HighlightDev - Sapphire Guild Command
				'950166288959946752',
			],
		});
	}

	protected async _sharedRun(
		messageOrInteraction: Message | Command.ChatInputCommandInteraction<'cached'>,
		isMessage: boolean,
	) {
		const invite = this.container.client.generateInvite({
			scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
			permissions: new PermissionsBitField([
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.EmbedLinks,
			]),
		});

		const embed = createInfoEmbed(
			[
				'Click the button below to add me to your server! 😄 🎉',
				'',
				`If that didn't work, try clicking [here](${invite}) instead.`,
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
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setURL(invite)
								.setLabel('Add me to your server!')
								.setEmoji({
									name: '🎉',
								}),
						),
					],
				},
			}),
		);
	}
}
