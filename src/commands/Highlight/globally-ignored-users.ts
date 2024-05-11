import { ApplyOptions } from '@sapphire/decorators';
import type { Args } from '@sapphire/framework';
import { Subcommand, type SubcommandMappingArray } from '@sapphire/plugin-subcommands';
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	Message,
	User,
	bold,
	inlineCode,
	quote,
	userMention,
} from 'discord.js';
import {
	GloballyIgnoredUsersClearCustomIdActions,
	GloballyIgnoredUsersClearIdFactory,
} from '#customIds/globally-ignored-users';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { getDatabaseUser } from '#utils/db';
import { createInfoEmbed } from '#utils/embeds';
import { Emojis, HelpDetailedDescriptionReplacers, resolveUserIdFromMessageOrInteraction } from '#utils/misc';
import type { HelpCommand } from '../Miscellaneous/help.js';

@ApplyOptions<Subcommand.Options>({
	description: 'Control which users should not highlight you in any servers you share with them.',
	detailedDescription: [
		quote("Here's how you can add a user to your global block list:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode('/globally-ignored-users add user:<user>'),
		)}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} globally-ignored-users add <user>`),
		)}`,
		'',
		quote(
			'You can also remove users from your global block list by using the same command, but with the `remove` subcommand instead.',
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode('/globally-ignored-users remove user:<user>'),
		)}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} globally-ignored-users remove <user>`),
		)}`,
		'',
		quote(
			'You can also list all the users that are currently in your global block list by using the `list` subcommand.',
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/globally-ignored-users list'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} globally-ignored-users list`),
		)}`,
		'',
		quote('You can also clear your global block list by using the `clear` subcommand.'),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/globally-ignored-users clear'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} globally-ignored-users clear`),
		)}`,
	].join('\n'),
	aliases: ['global_block', 'global_ignore', 'global-block'],
	generateUnderscoreLessAliases: true,
})
export class GlobalBlockCommand extends Subcommand {
	public subcommandMappings: SubcommandMappingArray = [
		{
			name: 'add',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const user = interaction.options.getUser('user', true);

				return this.addSubcommand(interaction, [user], false);
			},
			messageRun: async (message: Message<true>, args) => {
				const resolved = await this.resolveMessageArgs(args);

				if (resolved.length === 0) {
					await message.reply(
						withDeprecationWarningForMessageCommands({
							commandName: this.name,
							guildId: message.guildId!,
							receivedFromMessage: true,
							options: {
								embeds: [
									createInfoEmbed(
										'You need to provide at least one user to add to your global ignore list',
									),
								],
								ephemeral: true,
							},
						}),
					);

					return;
				}

				return this.addSubcommand(message, resolved, true);
			},
		},
		{
			name: 'remove',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const user = interaction.options.getUser('user', true);

				return this.removeSubcommand(interaction, [user], false);
			},
			messageRun: async (message: Message<true>, args) => {
				const resolved = await this.resolveMessageArgs(args);

				if (resolved.length === 0) {
					await message.reply(
						withDeprecationWarningForMessageCommands({
							commandName: this.name,
							guildId: message.guildId!,
							receivedFromMessage: true,
							options: {
								embeds: [
									createInfoEmbed(
										'You need to provide at least one user to remove from your global ignore list',
									),
								],
								ephemeral: true,
							},
						}),
					);

					return;
				}

				return this.removeSubcommand(message, resolved, true);
			},
		},
		{
			name: 'list',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				return this.listSubcommand(interaction, false);
			},
			messageRun: async (message: Message<true>) => {
				return this.listSubcommand(message, true);
			},
		},
		{
			name: 'clear',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				return this.clearSubcommand(interaction, false);
			},
			messageRun: async (message: Message<true>) => {
				return this.clearSubcommand(message, true);
			},
		},
		// Hidden subcommand to show the help menu by default
		{
			name: 'help',
			default: true,
			messageRun: async (message) => {
				return (this.container.stores.get('commands').get('help') as HelpCommand)['sendSingleCommandHelp'](
					message,
					this,
					true,
				);
			},
		},
	];

	public override async contextMenuRun(interaction: Subcommand.ContextMenuCommandInteraction<'cached'>) {
		if (!interaction.isUserContextMenuCommand()) {
			throw new Error('unreachable.');
		}

		if (interaction.commandName.toLowerCase().includes('remove')) {
			return this.removeSubcommand(interaction, [interaction.targetUser], false);
		}

		return this.addSubcommand(interaction, [interaction.targetUser], false);
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((serverIgnoreList) =>
			serverIgnoreList
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addSubcommand((add) =>
					add
						.setName('add')
						.setDescription('Adds a user to your global ignore list')
						.addUserOption((user) =>
							user.setName('user').setDescription('The user to ignore').setRequired(true),
						),
				)
				.addSubcommand((remove) =>
					remove
						.setName('remove')
						.setDescription('Removes a user from your global ignore list')

						.addUserOption((user) =>
							user.setName('user').setDescription('The user to stop ignoring').setRequired(true),
						),
				)
				.addSubcommand((list) =>
					list.setName('list').setDescription('Lists all users that you are globally ignoring'),
				)
				.addSubcommand((clear) => clear.setName('clear').setDescription('Clears your global ignore list')),
		);

		registry.registerContextMenuCommand((ignoreUser) =>
			ignoreUser.setName('Globally ignore user').setType(ApplicationCommandType.User).setDMPermission(false),
		);

		registry.registerContextMenuCommand((ignoreUser) =>
			ignoreUser
				.setName('Remove globally ignored user')
				.setType(ApplicationCommandType.User)
				.setDMPermission(false),
		);
	}

	private async addSubcommand(
		messageOrInteraction:
			| Message<true>
			| Subcommand.ChatInputCommandInteraction<'cached'>
			| Subcommand.ContextMenuCommandInteraction<'cached'>,
		args: User[],
		receivedFromMessage: boolean,
	) {
		// Sanity check
		if (args.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('You need to provide at least one user to add to your ignore list')],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const userId = resolveUserIdFromMessageOrInteraction(messageOrInteraction);
		const userData = await getDatabaseUser(userId);
		const added: string[] = [];
		const ignored: string[] = [];
		const seen = new Set<string>();

		const userIdsToAdd: string[] = [];

		for (const user of args) {
			// ignore duplicate entries
			if (seen.has(user.id)) {
				continue;
			}

			seen.add(user.id);

			if (user.id === userId) {
				ignored.push(`- ${userMention(user.id)}\n└ You cannot ignore yourself`);
				continue;
			}

			// Check that the user isn't already ignored
			if (userData.globallyIgnoredUsers.some((_user) => _user.ignoredUserId === user.id)) {
				ignored.push(`- ${userMention(user.id)}\n└ This user is already ignored`);
				continue;
			}

			// Add them in the database
			added.push(`- ${userMention(user.id)}`);
			userIdsToAdd.push(user.id);
		}

		if (added.length === 0 && ignored.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('There were no changes done to your global ignore list.')],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		if (userIdsToAdd.length) {
			await this.container.prisma.globalIgnoredUser.createMany({
				data: userIdsToAdd.map((ignoredUserId) => ({
					userId,
					ignoredUserId,
				})),
			});
		}

		const embed = createInfoEmbed(['Here are the changes done to your global ignore list:'].join('\n'));

		if (added.length) {
			embed.addFields({ name: 'Added', value: added.join('\n') });
		}

		if (ignored.length) {
			embed.addFields({ name: 'Already added', value: ignored.join('\n') });
		}

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage,
				options: {
					embeds: [embed],
					ephemeral: true,
				},
			}),
		);
	}

	private async removeSubcommand(
		messageOrInteraction:
			| Message<true>
			| Subcommand.ChatInputCommandInteraction<'cached'>
			| Subcommand.ContextMenuCommandInteraction<'cached'>,
		args: User[],
		receivedFromMessage: boolean,
	) {
		// Sanity check
		if (args.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [
							createInfoEmbed(
								'You need to provide at least one user to remove from your global ignore list',
							),
						],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const userId = resolveUserIdFromMessageOrInteraction(messageOrInteraction);
		const userData = await getDatabaseUser(userId);
		const removed: string[] = [];
		const ignored: string[] = [];
		const seen = new Set<string>();

		const userIdsToRemove: string[] = [];

		for (const user of args) {
			// ignore duplicate entries
			if (seen.has(user.id)) {
				continue;
			}

			seen.add(user.id);

			if (user.id === userId) {
				ignored.push(`- ${userMention(user.id)}\n└ You cannot un-ignore yourself`);
				continue;
			}

			// Check that the user isn't already ignored
			if (!userData.globallyIgnoredUsers.some((_user) => _user.ignoredUserId === user.id)) {
				ignored.push(`- ${userMention(user.id)}\n└ This user is not ignored`);
				continue;
			}

			// Add them in the database
			removed.push(`- ${userMention(user.id)}`);
			userIdsToRemove.push(user.id);
		}

		if (removed.length === 0 && ignored.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('There were no changes done to your global ignore list.')],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		if (userIdsToRemove.length) {
			await this.container.prisma.globalIgnoredUser.deleteMany({
				where: {
					userId,
					ignoredUserId: { in: userIdsToRemove },
				},
			});
		}

		const embed = createInfoEmbed(['Here are the changes done to your global ignore list:'].join('\n'));

		if (removed.length) {
			embed.addFields({ name: 'Removed', value: removed.join('\n') });
		}

		if (ignored.length) {
			embed.addFields({ name: 'Not present', value: ignored.join('\n') });
		}

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage,
				options: {
					embeds: [embed],
					ephemeral: true,
				},
			}),
		);
	}

	private async clearSubcommand(
		messageOrInteraction: Message<true> | Subcommand.ChatInputCommandInteraction<'cached'>,
		receivedFromMessage: boolean,
	) {
		const id = resolveUserIdFromMessageOrInteraction(messageOrInteraction);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage,
				options: {
					embeds: [createInfoEmbed('Are you sure you want to clear your ignore list?')],
					ephemeral: true,
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setLabel('Confirm')
								.setStyle(ButtonStyle.Danger)
								.setCustomId(
									GloballyIgnoredUsersClearIdFactory.encodeId({
										userId: id,
										action: GloballyIgnoredUsersClearCustomIdActions.Confirm,
									}).unwrap(),
								)
								.setEmoji('🧹'),
							new ButtonBuilder()
								.setLabel('Cancel')
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(
									GloballyIgnoredUsersClearIdFactory.encodeId({
										userId: id,
										action: GloballyIgnoredUsersClearCustomIdActions.Reject,
									}).unwrap(),
								)
								.setEmoji('❌'),
						),
					],
				},
			}),
		);
	}

	private async listSubcommand(
		messageOrInteraction: Message<true> | Subcommand.ChatInputCommandInteraction<'cached'>,
		receivedFromMessage: boolean,
	) {
		const userId = resolveUserIdFromMessageOrInteraction(messageOrInteraction);
		const userData = await getDatabaseUser(userId);

		if (userData.globallyIgnoredUsers.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('You are not ignoring any users globally.')],
						ephemeral: true,
					},
				}),
			);
		}
	}

	private async resolveMessageArgs(args: Args) {
		return args.repeat('user');
	}
}
