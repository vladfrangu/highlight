/* eslint-disable n/callback-return,promise/prefer-await-to-callbacks */

import { randomUUID } from 'node:crypto';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, UserError, container } from '@sapphire/framework';
import type {
	Args,
	Piece,
	Awaitable,
	ChatInputCommandErrorPayload,
	ContextMenuCommandErrorPayload,
	MessageCommandErrorPayload,
} from '@sapphire/framework';
import type {
	ChatInputSubcommandErrorPayload,
	MessageSubcommandErrorPayload,
	MessageSubcommandNoMatchContext,
} from '@sapphire/plugin-subcommands';
import { SubcommandPluginEvents } from '@sapphire/plugin-subcommands';
import {
	type Message,
	type PartialGroupDMChannel,
	ActionRowBuilder,
	bold,
	codeBlock,
	inlineCode,
	type InteractionReplyOptions,
	type MessageCreateOptions,
} from 'discord.js';
import { useErrorWebhook } from '#hooks/useErrorWebhook';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createErrorEmbed } from '#utils/embeds';
import { SupportServerButton, orList, pluralize, supportServerInvite } from '#utils/misc';

@ApplyOptions<Listener.Options>({ name: 'MessageCommandError', event: Events.MessageCommandError })
export class MessageCommandError extends Listener<typeof Events.MessageCommandError> {
	public override async run(error: unknown, { message, command }: MessageCommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed<MessageCreateOptions>(
			maybeError,
			async (options) =>
				(message.channel as Exclude<Message['channel'], PartialGroupDMChannel>).send(
					withDeprecationWarningForMessageCommands({
						commandName: command.name,
						guildId: message.guildId,
						receivedFromMessage: true,
						options,
					}),
				),
			command,
		);
	}
}

@ApplyOptions<Listener.Options>({ name: 'ChatInputCommandError', event: Events.ChatInputCommandError })
export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public override async run(error: unknown, { interaction, command }: ChatInputCommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed<InteractionReplyOptions>(
			maybeError,
			async (options) => {
				if (interaction.replied) {
					return interaction.followUp({ ...options, ephemeral: true });
				} else if (interaction.deferred) {
					return interaction.editReply(options as never);
				}

				return interaction.reply({ ...options, ephemeral: true });
			},
			command,
		);
	}
}

@ApplyOptions<Listener.Options>({ name: 'ContextMenuCommandError', event: Events.ContextMenuCommandError })
export class ContextMenuCommandError extends Listener<typeof Events.ContextMenuCommandError> {
	public override async run(error: unknown, { interaction, command }: ContextMenuCommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed<InteractionReplyOptions>(
			maybeError,
			async (options) => {
				if (interaction.replied) {
					return interaction.followUp({ ...options, ephemeral: true });
				} else if (interaction.deferred) {
					return interaction.editReply(options as never);
				}

				return interaction.reply({ ...options, ephemeral: true });
			},
			command,
		);
	}
}

@ApplyOptions<Listener.Options>({
	name: 'MessageCommandSubcommandCommandError',
	event: SubcommandPluginEvents.MessageSubcommandError,
})
export class MessageCommandSubcommandCommandError extends Listener<
	typeof SubcommandPluginEvents.MessageSubcommandError
> {
	public override async run(error: unknown, { message, command }: MessageSubcommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed<MessageCreateOptions>(
			maybeError,
			async (options) =>
				(message.channel as Exclude<Message['channel'], PartialGroupDMChannel>).send(
					withDeprecationWarningForMessageCommands({
						commandName: command.name,
						guildId: message.guildId,
						receivedFromMessage: true,
						options,
					}),
				),
			command,
		);
	}
}

@ApplyOptions<Listener.Options>({
	name: 'ChatInputCommandSubcommandCommandError',
	event: SubcommandPluginEvents.ChatInputSubcommandError,
})
export class ChatInputCommandSubcommandCommandError extends Listener<
	typeof SubcommandPluginEvents.ChatInputSubcommandError
> {
	public override async run(error: unknown, { interaction, command }: ChatInputSubcommandErrorPayload) {
		const maybeError = error as Error;

		await makeAndSendErrorEmbed<InteractionReplyOptions>(
			maybeError,
			async (options) => {
				if (interaction.replied) {
					return interaction.followUp({ ...options, ephemeral: true });
				} else if (interaction.deferred) {
					return interaction.editReply(options as never);
				}

				return interaction.reply({ ...options, ephemeral: true });
			},
			command,
		);
	}
}

// Overrides the built-in listener, which only logs the mismatch
@ApplyOptions<Listener.Options>({
	name: 'PluginMessageSubcommandNoMatch',
	event: SubcommandPluginEvents.MessageSubcommandNoMatch,
})
export class MessageSubcommandNoMatch extends Listener<typeof SubcommandPluginEvents.MessageSubcommandNoMatch> {
	public override async run(message: Message, _args: Args, ctx: MessageSubcommandNoMatchContext) {
		const { command } = ctx;
		const callback = async (options: MessageCreateOptions) =>
			(message.channel as Exclude<Message['channel'], PartialGroupDMChannel>).send(
				withDeprecationWarningForMessageCommands({
					commandName: command.name,
					guildId: message.guildId,
					receivedFromMessage: true,
					options,
				}),
			);

		if (!command.supportsMessageCommands()) {
			// This command can strictly be ran via slash commands only!
			await callback({
				embeds: [createErrorEmbed(`🤐 This command can only be ran via slash commands!`)],
			} as never);

			return;
		}

		const mappings = command.parsedSubcommandMappings;

		let foundMessageMapping = mappings.find(
			(mapping) =>
				(mapping.type === 'method' && mapping.name === ctx.possibleSubcommandGroupOrName) ||
				(mapping.type === 'group' &&
					mapping.entries.some((entry) => entry.name === ctx.possibleSubcommandName)),
		);

		if (foundMessageMapping?.type === 'group') {
			foundMessageMapping = foundMessageMapping.entries.find(
				(mapping) => mapping.type === 'method' && mapping.name === ctx.possibleSubcommandName,
			);
		}

		if (foundMessageMapping) {
			const errorUuid = randomUUID();

			await useErrorWebhook().send({
				content: `Encountered missing message command mapping for command ${inlineCode(
					command.name,
				)}, subcommand group ${inlineCode(`${ctx.possibleSubcommandGroupOrName}`)}, subcommand ${inlineCode(
					`${ctx.possibleSubcommandGroupOrName}`,
				)}.\n\nUUID: ${bold(inlineCode(errorUuid))}`,
			});

			await callback({
				embeds: [
					createErrorEmbed(
						`😖 I seem to have forgotten to map the ${inlineCode(
							ctx.possibleSubcommandName ?? ctx.possibleSubcommandGroupOrName!,
						)} properly for you. Please report this error ID to my developer: ${bold(inlineCode(errorUuid))}!`,
					),
				],
				components: [new ActionRowBuilder().setComponents(SupportServerButton)],
			} as never);

			return;
		}

		const actualSubcommandNames = mappings
			.map((entry) => bold(inlineCode(entry.name)))
			.sort((a, b) => a.localeCompare(b));

		const prettyList = orList.format(actualSubcommandNames);

		await callback({
			embeds: [
				createErrorEmbed(
					`The subcommand you provided is unknown to me or you didn't provide any! ${pluralize(
						actualSubcommandNames.length,
						'This is',
						'These are',
					)} the ${pluralize(actualSubcommandNames.length, 'subcommand', 'subcommands')} I know about: ${prettyList}`,
				),
			],
		} as never);
	}
}

async function makeAndSendErrorEmbed<Options>(
	error: Error | UserError,
	callback: (options: Options) => Awaitable<unknown>,
	piece: Piece,
) {
	const errorUuid = randomUUID();
	const webhook = useErrorWebhook();
	const { name, location } = piece;

	if (error instanceof UserError) {
		const errorEmbed = createErrorEmbed(error.message);

		await callback({ embeds: [errorEmbed], allowedMentions: { parse: [] } } as never);

		return;
	}

	container.logger.error(
		`Encountered error while running command`,
		{ commandName: name, filePath: location.full },
		error,
	);

	await webhook.send({
		content: `Encountered an unexpected error, take a look @here!\nUUID: ${bold(inlineCode(errorUuid))}`,
		embeds: [
			createErrorEmbed(codeBlock('ansi', error.stack ?? error.message)).setFields(
				{ name: 'Command', value: name },
				{ name: 'Path', value: location.full },
			),
		],
		allowedMentions: { parse: ['everyone'] },
		avatarURL: container.client.user!.displayAvatarURL(),
		username: 'Error encountered',
	});

	const errorEmbed = createErrorEmbed(
		`Please send the following code to our [support server](${supportServerInvite}): ${bold(
			inlineCode(errorUuid),
		)}\n\nYou can also mention the following error message: ${codeBlock('ansi', error.message)}`,
	).setTitle('An unexpected error occurred! 😱');

	await callback({
		components: [new ActionRowBuilder().setComponents(SupportServerButton)],
		embeds: [errorEmbed],
		allowedMentions: { parse: [] },
	} as never);
}
