import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createErrorEmbed, createSuccessEmbed } from '#utils/embeds';
import { Emojis, HelpDetailedDescriptionReplacers, orList } from '#utils/misc';
import { bold, inlineCode, quote } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { AutoCompleteLimits } from '@sapphire/discord-utilities';
import { Args, ChatInputCommand, Command, MessageCommand, Result } from '@sapphire/framework';
import { jaroWinkler } from '@skyra/jaro-winkler';
import { Collection, Message } from 'discord.js';

const randomMissingPermissionMessages = [
	'🙈 This maze was not meant for you.',
	"🤔 I don't think you can run that command here.",
	'🔒 You do not have permission to run this command here.',
	"🧐 Something feels off...how do you know about this command? (You don't have permissions to run this command here)",
	'🤐 I cannot tell you about this command! You do not have permissions to run it here!',
	"😱 Woah, woah, woah! I don't know how you know about this command, but you cannot run it here!",
];

@ApplyOptions<Command.Options>({
	description: 'See what commands are available to you, and how to use them',
	detailedDescription: [
		"If you want to list all commands you have access to, here's how to run it:",
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/help'))}`,
		`For message based commands: ${bold(inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} help`))}`,
		'',
		`If you want to get help for a specific command, here are some examples that you can use.`,
		quote(
			`You should replace ${inlineCode('<command_name>')} with a command name (like ${inlineCode('help')} for example)`,
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode(`/help command:<command_name>`))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} help <command_name>`),
		)}`,
	].join('\n'),
})
export class HelpCommand extends Command {
	public override async chatInputRun(interaction: Command.ChatInputInteraction) {
		const maybeCommand = interaction.options.getString('command');

		if (maybeCommand) {
			const actualCommandName = this.resolvePossibleCommandName(maybeCommand);
			const result = this.findCommandByName(actualCommandName);

			if (result.exact) {
				return this.sendSingleCommandHelp(interaction, result.match, false);
			}

			const almostExactMatch = result.maybeMatch.find((cmd) => jaroWinkler(cmd.name, actualCommandName) >= 0.9);

			if (almostExactMatch) {
				return this.sendSingleCommandHelp(interaction, almostExactMatch, false);
			}

			return this.replyWithPossibleCommandNames(interaction, actualCommandName, result.maybeMatch, false);
		}

		return this.replyWithAllCommandsTheUserCanRun(interaction, false);
	}

	public override async messageRun(message: Message, args: Args) {
		const maybeCommand = await args.rest('string').catch(() => null);

		if (maybeCommand) {
			const result = this.findCommandByName(maybeCommand);

			if (result.exact) {
				return this.sendSingleCommandHelp(message, result.match, true);
			}

			const almostExactMatch = result.maybeMatch.find((cmd) => jaroWinkler(cmd.name, maybeCommand) >= 0.9);

			if (almostExactMatch) {
				return this.sendSingleCommandHelp(message, almostExactMatch, true);
			}

			return this.replyWithPossibleCommandNames(message, maybeCommand, result.maybeMatch, true);
		}

		return this.replyWithAllCommandsTheUserCanRun(message, true);
	}

	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name !== 'command') {
			await interaction.respond([]);
			return;
		}

		const allCommands = [...this.store.values()] as Command[];
		const providedAutocompleteName = focusedOption.value as string;
		const providedAutocompleteFilterName = providedAutocompleteName.toLowerCase();

		const startsWithChunk = allCommands
			.filter((cmd) => cmd.name.toLowerCase().startsWith(providedAutocompleteFilterName))
			.sort((a, b) => a.name.localeCompare(b.name));

		const includesChunk = allCommands
			.filter((cmd) => cmd.name.toLowerCase().includes(providedAutocompleteFilterName))
			.sort((a, b) => a.name.localeCompare(b.name));

		const alreadyProcessed: string[] = [];
		const options: Parameters<typeof interaction['respond']>[0] = [];

		for (const command of startsWithChunk) {
			// If we already got all possible commands, exit early
			if (options.length === AutoCompleteLimits.MaximumAmountOfOptions) {
				break;
			}

			if (alreadyProcessed.includes(command.name)) {
				continue;
			}

			alreadyProcessed.push(command.name);

			const canRun = await this.canRunCommand(interaction as any, command, false);

			if (canRun) {
				options.push({
					name: `🌟 ${command.name} - ${command.category ?? 'Category-less'} command`,
					value: command.name,
				});
			}
		}

		for (const command of includesChunk) {
			// If we already got all possible commands, exit early
			if (options.length === AutoCompleteLimits.MaximumAmountOfOptions) {
				break;
			}

			if (alreadyProcessed.includes(command.name)) {
				continue;
			}

			alreadyProcessed.push(command.name);

			const canRun = await this.canRunCommand(interaction as any, command, false);

			if (canRun) {
				options.push({
					name: `${command.name} - ${command.category ?? 'Category-less'} command`,
					value: command.name,
				});
			}
		}

		await interaction.respond(options);
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.addStringOption((command) =>
						command
							.setName('command')
							.setDescription('The command to get help for')
							.setRequired(false)
							.setAutocomplete(true),
					),
			{
				guildIds: useDevelopmentGuildIds(),
				idHints: [
					// HighlightDev - Sapphire Guild Command
					'955109568655015987',
				],
			},
		);
	}

	private resolvePossibleCommandName(commandName: string) {
		const mightHaveAutocompleteNameInsteadOfValue = commandName.indexOf(' - ');

		// 🌟 exam-ple - Category-less command
		if (commandName.startsWith('🌟')) {
			return commandName.slice(2, mightHaveAutocompleteNameInsteadOfValue).trim();
		}

		// exam-ple - Category-less command
		if (mightHaveAutocompleteNameInsteadOfValue !== -1) {
			return commandName.slice(0, mightHaveAutocompleteNameInsteadOfValue);
		}

		return commandName;
	}

	private findCommandByName(commandName: string) {
		const storeEntry =
			this.store.get(commandName) ?? this.store.find((cmd) => cmd.name.toLowerCase() === commandName.toLowerCase());

		if (storeEntry) {
			return { exact: true as const, match: storeEntry as Command } as const;
		}

		const maybeEntries = [...this.store.values()]
			.filter((cmd) => jaroWinkler(cmd.name.toLowerCase(), commandName.toLowerCase()) >= 0.85)
			.sort((a, b) => a.name.localeCompare(b.name)) as Command[];

		return { exact: false as const, maybeMatch: maybeEntries } as const;
	}

	private async replyWithPossibleCommandNames(
		messageOrInteraction: Message | Command.ChatInputInteraction,
		input: string,
		matches: Command[],
		isMessage = false,
	) {
		const empathyChance = Math.random() * 100 < 5;

		if (!matches.length) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage: isMessage,
					options: {
						embeds: [
							createErrorEmbed(
								`${
									empathyChance
										? '🍌 Not even the empathy banana knows of a command called'
										: "👀 I don't know of a command called"
								} ${bold(inlineCode(input))}. Try running ${bold(inlineCode('/help'))} to see all available commands!`,
							),
						],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const list = orList.format(matches.map((cmd) => bold(inlineCode(cmd.name))));

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					embeds: [
						createErrorEmbed(
							`${
								empathyChance
									? "🍌 The magnifier broke, but fear not! Empathy banana is here to let you know that I couldn't find a command called"
									: "🔎 I couldn't find a command called"
							} ${bold(inlineCode(input))}. Maybe one of these match your search: ${list}`,
						),
					],
					ephemeral: true,
				},
			}),
		);
	}

	private async canRunCommand(
		messageOrInteraction: Message | Command.ChatInputInteraction,
		command: Command,
		isMessage = false,
	) {
		const preconditionStore = this.container.stores.get('preconditions');

		// Run global preconditions
		let globalResult: Result<unknown, unknown>;

		if (isMessage) {
			globalResult = await preconditionStore.messageRun(messageOrInteraction as Message, command as MessageCommand, {
				external: true,
			});
		} else {
			globalResult = await preconditionStore.chatInputRun(
				messageOrInteraction as Command.ChatInputInteraction,
				command as ChatInputCommand,
				{
					external: true,
				},
			);
		}

		if (!globalResult.success) {
			return false;
		}

		// Run command preconditions
		let localResult: Result<unknown, unknown>;

		if (isMessage) {
			localResult = await command.preconditions.messageRun(messageOrInteraction as Message, command as MessageCommand, {
				external: true,
			});
		} else {
			localResult = await command.preconditions.chatInputRun(
				messageOrInteraction as Command.ChatInputInteraction,
				command as ChatInputCommand,
				{
					external: true,
				},
			);
		}

		if (!localResult.success) {
			return false;
		}

		// If all checks pass, we're good to go
		return true;
	}

	private async sendSingleCommandHelp(
		messageOrInteraction: Message | Command.ChatInputInteraction,
		command: Command,
		isMessage = false,
	) {
		const canRun = await this.canRunCommand(messageOrInteraction, command, isMessage);

		if (!canRun) {
			const randomMessage =
				randomMissingPermissionMessages.at(Math.floor(Math.random() * randomMissingPermissionMessages.length)) ||
				randomMissingPermissionMessages[0];

			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage: isMessage,
					options: {
						embeds: [createErrorEmbed(randomMessage)],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const description = [command.description];

		if (['-', '_'].some((char) => command.name.includes(char))) {
			description.push(
				'',
				quote(
					`For message based commands, if the command name includes a ${bold(inlineCode('-'))} or ${bold(
						inlineCode('_'),
					)}, the dashes/underscores are optional in the command name. (for example ${bold(
						inlineCode('allowed-roles'),
					)} can be used as ${bold(inlineCode('allowedroles'))} too)`,
				),
			);
		}

		const responseEmbed = createSuccessEmbed(description.join('\n')).setTitle(
			`/${command.name} - ${command.category ?? 'Category-less'} Command`,
		);

		if (command.detailedDescription) {
			const final = (command.detailedDescription as string).replaceAll(
				HelpDetailedDescriptionReplacers.UserMention,
				`@${this.container.client.user!.username}`,
			);

			responseEmbed.addField('📝 | Usage examples', final);
		}

		const supportsMessageCommands = command.supportsMessageCommands();
		const supportsChatInputCommands = command.supportsChatInputCommands();

		if (supportsMessageCommands && !supportsChatInputCommands) {
			responseEmbed.addField(
				'⚠️ Warning ⚠️',
				`This command can only be ran via messages (invoke it by using ${bold(
					inlineCode(`@${this.container.client.user!.username} ${command.name}`),
				)})`,
			);
		} else if (!supportsMessageCommands && supportsChatInputCommands) {
			responseEmbed.addField(
				'⚠️ Warning ⚠️',
				`This command can only be ran via ${Emojis.ChatInputCommands} chat input commands (invoke it by using ${bold(
					inlineCode(`/${command.name}`),
				)})`,
			);
		}

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					ephemeral: true,
					embeds: [responseEmbed],
				},
			}),
		);
	}

	private async replyWithAllCommandsTheUserCanRun(
		messageOrInteraction: Message | Command.ChatInputInteraction,
		isMessage = false,
	) {
		// Step 1. Get all commands the user can run
		const commandsTheUserCanRun = (
			await Promise.all(
				[...this.store.values()].map(async (command) => {
					const canRun = await this.canRunCommand(messageOrInteraction, command as Command, isMessage);

					return canRun ? command : null;
				}),
			)
		).filter((item): item is Command => item !== null);

		const categoryAndCommands = new Collection<string, Command[]>();

		for (const command of commandsTheUserCanRun) {
			const entry = categoryAndCommands.get(command.category ?? 'Category-less');

			if (entry) {
				categoryAndCommands.set(command.category ?? 'Category-less', [...entry, command]);
			} else {
				categoryAndCommands.set(command.category ?? 'Category-less', [command]);
			}
		}

		const sorted = categoryAndCommands.sorted((_, __, catA, catB) => catA.localeCompare(catB));

		const embed = createSuccessEmbed(
			`Here is a list of all commands you can run in this server! You can run ${bold(
				inlineCode('/help <command_name>'),
			)} to find out more about each command. 🎉`,
		);

		for (const [category, commands] of sorted.entries()) {
			embed.addField(
				`${category} Commands`,
				commands
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((command) => `${bold(inlineCode(`/${command.name}`))} - ${command.description}`)
					.join('\n'),
			);
		}

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					embeds: [embed],
					ephemeral: true,
				},
			}),
		);
	}
}
