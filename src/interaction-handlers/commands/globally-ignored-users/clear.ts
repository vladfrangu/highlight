import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import {
	GloballyIgnoredUsersClearCustomIdActions,
	GloballyIgnoredUsersClearIdFactory,
} from '#customIds/globally-ignored-users';
import { createInfoEmbed } from '#utils/embeds';

@ApplyOptions<InteractionHandler.Options>({
	name: 'globallyIgnoredUsersClear',
	interactionHandlerType: InteractionHandlerTypes.Button,
})
export class GloballyIgnoredUsersClearHandler extends InteractionHandler {
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
			case GloballyIgnoredUsersClearCustomIdActions.Confirm: {
				await this.container.prisma.globalIgnoredUser.deleteMany({
					where: { userId: parsedData.userId },
				});

				await interaction.update({
					embeds: [createInfoEmbed('Your global ignore list has been cleared 🧹')],
					components: [],
				});

				break;
			}

			case GloballyIgnoredUsersClearCustomIdActions.Reject: {
				await interaction.update({
					embeds: [createInfoEmbed('Your global ignore list has not been cleared')],
					components: [],
				});

				break;
			}
		}
	}

	public override parse(interaction: ButtonInteraction) {
		return GloballyIgnoredUsersClearIdFactory.decodeId(interaction.customId);
	}
}
