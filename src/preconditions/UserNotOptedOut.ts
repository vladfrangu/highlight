import { AllFlowsPrecondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { TimestampStyles, time } from 'discord.js';

export class AllowedRole extends AllFlowsPrecondition {
	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		return this._sharedRun(interaction.user.id);
	}

	public async messageRun(message: Message) {
		return this._sharedRun(message.author.id);
	}

	public async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return this._sharedRun(interaction.user.id);
	}

	private async _sharedRun(userId: string) {
		const userSettings = await this.container.prisma.user.findFirst({ where: { id: userId, optedOut: true } });

		// No user settings found or hasn't opted out
		if (!userSettings) {
			return this.ok();
		}

		const formattedTime = time(userSettings.optedOutAt!, TimestampStyles.ShortDateTime);

		return this.error({
			message: `\n\n⛔ You opted out from highlight on ${formattedTime}.\nIf you'd like to use my features, you'll need to opt back in again by running **\`/highlight opt-in\`**.`,
		});
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		UserNotOptedOut: never;
	}
}
