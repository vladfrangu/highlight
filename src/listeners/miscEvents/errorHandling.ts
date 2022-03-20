import { createErrorEmbed } from '#utils/embeds';
import { ApplyOptions } from '@sapphire/decorators';
import {
	Awaitable,
	ChatInputCommandErrorPayload,
	ContextMenuCommandErrorPayload,
	Events,
	Listener,
	MessageCommandErrorPayload,
} from '@sapphire/framework';
import { MessageActionRow, MessageButton, MessageOptions } from 'discord.js';

@ApplyOptions<Listener.Options>({
	name: 'MessageCommandError',
	event: Events.MessageCommandError,
})
export class MessageCommandError extends Listener<typeof Events.MessageCommandError> {
	public override async run(error: unknown, { message }: MessageCommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed(maybeError, (options) => message.channel.send(options));
	}
}

@ApplyOptions<Listener.Options>({
	name: 'ChatInputCommandError',
	event: Events.ChatInputCommandError,
})
export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public override async run(error: unknown, { interaction }: ChatInputCommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed(maybeError, (options) => {
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
	name: 'ContextMenuCommandError',
	event: Events.ContextMenuCommandError,
})
export class ContextMenuCommandError extends Listener<typeof Events.ContextMenuCommandError> {
	public override async run(error: unknown, { interaction }: ContextMenuCommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed(maybeError, (options) => {
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

async function makeAndSendErrorEmbed(error: Error, callback: (options: MessageOptions) => Awaitable<unknown>) {
	const errorEmbed = createErrorEmbed(
		`Please send the following to our [support server](${process.env.SUPPORT_SERVER_INVITE}):\n\`\`\`\n${error.message}\n\`\`\``,
	).setTitle('An unexpected error occurred! 😱');

	await callback({
		components: [
			new MessageActionRow().setComponents([
				new MessageButton()
					.setStyle('LINK')
					.setURL(process.env.SUPPORT_SERVER_INVITE!)
					.setEmoji('🆘')
					.setLabel('Support server'),
			]),
		],
		embeds: [errorEmbed],
	});
}
