import { AllFlowsPrecondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { User } from 'discord.js';

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
		const application = await this.container.client.application!.fetch();

		if (application.owner instanceof User) {
			return application.owner.id === userId
				? this.ok()
				: this.error({ message: `This maze was not meant for you.` });
		}

		if (application.owner?.ownerId === userId) return this.ok();
		if (application.owner?.members?.has(userId)) return this.ok();

		return this.error({ message: `This maze was not meant for you.` });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ApplicationOwnerOnly: never;
	}
}
