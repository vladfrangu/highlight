import { createErrorEmbed } from '#utils/embeds';
import { ApplyOptions } from '@sapphire/decorators';
import {
	Awaitable,
	ChatInputCommandDeniedPayload,
	ContextMenuCommandDeniedPayload,
	Events,
	Listener,
	MessageCommandDeniedPayload,
	UserError,
} from '@sapphire/framework';
import type { MessageOptions } from 'discord.js';

@ApplyOptions<Listener.Options>({
	name: 'MessageCommandDenied',
	event: Events.MessageCommandDenied,
})
export class MessageCommandDenied extends Listener<typeof Events.MessageCommandDenied> {
	public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
		await makeAndSendDeniedEmbed(error, (options) => message.channel.send(options));
	}
}

@ApplyOptions<Listener.Options>({
	name: 'ChatInputCommandDenied',
	event: Events.ChatInputCommandDenied,
})
export class ChatInputCommandDenied extends Listener<typeof Events.ChatInputCommandDenied> {
	public override async run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
		await makeAndSendDeniedEmbed(error, (options) => {
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
		await makeAndSendDeniedEmbed(error, (options) => {
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

async function makeAndSendDeniedEmbed(error: UserError, callback: (options: MessageOptions) => Awaitable<unknown>) {
	const errorEmbed = createErrorEmbed(`🙈 You cannot run this command! ${error.message}`);

	await callback({ embeds: [errorEmbed] });
}
