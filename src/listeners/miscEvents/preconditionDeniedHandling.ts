/* eslint-disable sonarjs/no-identical-functions,n/no-callback-literal,n/callback-return,promise/prefer-await-to-callbacks */
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type {
	UserError,
	Awaitable,
	ChatInputCommandDeniedPayload,
	ContextMenuCommandDeniedPayload,
	MessageCommandDeniedPayload,
} from '@sapphire/framework';
import type { BaseMessageOptions, InteractionReplyOptions, MessageCreateOptions } from 'discord.js';
import { createErrorEmbed } from '#utils/embeds';

@ApplyOptions<Listener.Options>({
	name: 'MessageCommandDenied',
	event: Events.MessageCommandDenied,
})
export class MessageCommandDenied extends Listener<typeof Events.MessageCommandDenied> {
	public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
		await makeAndSendDeniedEmbed<MessageCreateOptions>(error, async (options) => message.reply(options));
	}
}

@ApplyOptions<Listener.Options>({
	name: 'ChatInputCommandDenied',
	event: Events.ChatInputCommandDenied,
})
export class ChatInputCommandDenied extends Listener<typeof Events.ChatInputCommandDenied> {
	public override async run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
		await makeAndSendDeniedEmbed<InteractionReplyOptions>(error, async (options) => {
			if (interaction.replied) {
				return interaction.followUp({
					...options,
					ephemeral: true,
				});
			} else if (interaction.deferred) {
				return interaction.editReply(options);
			}

			return interaction.reply({
				...options,
				ephemeral: true,
			});
		});
	}
}

@ApplyOptions<Listener.Options>({
	name: 'ContextMenuCommandDenied',
	event: Events.ContextMenuCommandDenied,
})
export class ContextMenuCommandDenied extends Listener<typeof Events.ContextMenuCommandDenied> {
	public override async run(error: UserError, { interaction }: ContextMenuCommandDeniedPayload) {
		await makeAndSendDeniedEmbed<InteractionReplyOptions>(error, async (options) => {
			if (interaction.replied) {
				return interaction.followUp({
					...options,
					ephemeral: true,
				});
			} else if (interaction.deferred) {
				return interaction.editReply(options);
			}

			return interaction.reply({
				...options,
				ephemeral: true,
			});
		});
	}
}

async function makeAndSendDeniedEmbed<Options extends BaseMessageOptions>(
	error: UserError,
	callback: (options: Options) => Awaitable<unknown>,
) {
	const errorEmbed = createErrorEmbed(`🙈 You cannot run this command! ${error.message}`);

	await callback({ embeds: [errorEmbed] } as never);
}
