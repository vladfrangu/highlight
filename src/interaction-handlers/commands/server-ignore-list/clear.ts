import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { createInfoEmbed } from '#utils/embeds';
import { ServerIgnoreListClearCustomIdActions, ServerIgnoreListClearIdFactory } from '#customIds/server-ignore-list';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ServerIgnoreListClearHandler extends InteractionHandler {
	public override async run(interaction: ButtonInteraction, parsedData: InteractionHandler.ParseResult<this>) {
		if (!interaction.inGuild()) {
			await interaction.reply({
				embeds: [createInfoEmbed('These buttons can only be used in a server')],
				ephemeral: true,
			});

			return;
		}

		if (interaction.user.id !== parsedData.userId) {
			await interaction.reply({
				embeds: [createInfoEmbed("You cannot alter another user's ignore list")],
				ephemeral: true,
			});

			return;
		}

		switch (parsedData.action) {
			case ServerIgnoreListClearCustomIdActions.Confirm: {
				await this.container.prisma.guildIgnoredUser.deleteMany({
					where: { userId: parsedData.userId, guildId: interaction.guildId },
				});

				await this.container.prisma.guildIgnoredChannel.deleteMany({
					where: { userId: parsedData.userId, guildId: interaction.guildId },
				});

				await interaction.update({
					embeds: [createInfoEmbed('Your ignore list has been cleared 🧹')],
					components: [],
				});

				break;
			}

			case ServerIgnoreListClearCustomIdActions.Reject: {
				await interaction.update({
					embeds: [createInfoEmbed('Your ignore list has not been cleared')],
					components: [],
				});

				break;
			}
		}
	}

	public override parse(interaction: ButtonInteraction) {
		return ServerIgnoreListClearIdFactory.decodeId(interaction.customId);
	}
}
