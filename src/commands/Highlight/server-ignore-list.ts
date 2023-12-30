import { ServerIgnoreListClearCustomIdActions, ServerIgnoreListClearIdFactory } from '#customIds/server-ignore-list';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { getDatabaseMember } from '#utils/db';
import { createInfoEmbed } from '#utils/embeds';
import { Emojis, HelpDetailedDescriptionReplacers, resolveUserIdFromMessageOrInteraction } from '#utils/misc';
import { ApplyOptions } from '@sapphire/decorators';
import { Args, Resolvers } from '@sapphire/framework';
import { Subcommand, type SubcommandMappingArray } from '@sapphire/plugin-subcommands';
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Message,
	bold,
	channelMention,
	inlineCode,
	italic,
	quote,
	userMention,
	type ForumChannel,
	type GuildTextBasedChannel,
	type User,
} from 'discord.js';
import type { HelpCommand } from '../Miscellaneous/help.js';

type AllowedChannel = GuildTextBasedChannel | ForumChannel;
type BlockArgument = { type: 'user'; value: User } | { type: 'channel'; value: AllowedChannel };

const allowedChannelTypes = [
	ChannelType.GuildAnnouncement,
	ChannelType.GuildStageVoice,
	ChannelType.GuildText,
	ChannelType.PrivateThread,
	ChannelType.PublicThread,
	ChannelType.GuildVoice,
	ChannelType.GuildForum,
] as const;

@ApplyOptions<Subcommand.Options>({
	description: 'Control which users or channels should not highlight you in the current server',
	detailedDescription: [
		quote("Here's how you can add a user or a channel to your block list:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode('/server-ignore-list add user:<user>|channel:<channel>'),
		)}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} server-ignore-list add <user|channel>`),
		)}`,
		'',
		italic('You can provide both users and channels when running this command.'),
		'',
		quote(
			'You can also remove users or channels from your block list by using the same command, but with the `remove` subcommand instead.',
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode('/server-ignore-list remove user:<user>|channel:<channel>'),
		)}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} server-ignore-list remove <user|channel>`),
		)}`,
		'',
		quote(
			'You can also list all the users and channels that are currently in your block list by using the `list` subcommand.',
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/server-ignore-list list'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} server-ignore-list list`),
		)}`,
		'',
		quote(
			'You can also clear your block list by using the `clear` subcommand. This will remove all users and channels from your block list.',
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/server-ignore-list clear'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} server-ignore-list clear`),
		)}`,
	].join('\n'),
	preconditions: ['GuildOnly'],
	aliases: ['block', 'block-list', 'block_list', 'server_ignore_list'],
	generateDashLessAliases: true,
	generateUnderscoreLessAliases: true,
})
export class BlockCommand extends Subcommand {
	public subcommandMappings: SubcommandMappingArray = [
		{
			name: 'add',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const args = this.resolveChatInputCommandArgs(interaction);

				if (args.length === 0) {
					await interaction.reply(
						withDeprecationWarningForMessageCommands({
							commandName: this.name,
							guildId: interaction.guildId,
							receivedFromMessage: false,
							options: {
								embeds: [
									createInfoEmbed(
										'You need to provide at least one user or channel to add to your ignore list',
									),
								],
								ephemeral: true,
							},
						}),
					);

					return;
				}

				return this.addSubcommand(interaction, args, false);
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
										'You need to provide at least one user or channel to add to your ignore list',
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
				const args = this.resolveChatInputCommandArgs(interaction);

				if (args.length === 0) {
					await interaction.reply(
						withDeprecationWarningForMessageCommands({
							commandName: this.name,
							guildId: interaction.guildId,
							receivedFromMessage: false,
							options: {
								embeds: [
									createInfoEmbed(
										'You need to provide at least one user or channel to remove from your ignore list',
									),
								],
								ephemeral: true,
							},
						}),
					);

					return;
				}

				return this.removeSubcommand(interaction, args, false);
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
										'You need to provide at least one user or channel to remove from your ignore list',
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
			chatInputRun: (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				return this.listSubcommand(interaction, false);
			},
			messageRun: (message: Message<true>) => {
				return this.listSubcommand(message, true);
			},
		},
		{
			name: 'clear',
			chatInputRun: (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				return this.clearSubcommand(interaction, false);
			},
			messageRun: (message: Message<true>) => {
				return this.clearSubcommand(message, true);
			},
		},
		// Hidden subcommand to show the help menu by default
		{
			name: 'help',
			default: true,
			messageRun: (message) => {
				return (this.container.stores.get('commands').get('help') as HelpCommand)['sendSingleCommandHelp'](
					message,
					this,
					true,
				);
			},
		},
	];

	public override contextMenuRun(interaction: Subcommand.ContextMenuCommandInteraction<'cached'>) {
		if (!interaction.isUserContextMenuCommand()) {
			throw new Error('unreachable.');
		}

		return this.addSubcommand(interaction, [{ type: 'user', value: interaction.targetUser }], false);
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
						.setDescription('Adds a channel or user to your server ignore list')
						.addChannelOption((channel) =>
							channel
								.setName('channel')
								.setDescription('The channel to ignore')
								.addChannelTypes(...allowedChannelTypes),
						)
						.addUserOption((user) => user.setName('user').setDescription('The user to ignore')),
				)
				.addSubcommand((remove) =>
					remove
						.setName('remove')
						.setDescription('Removes a channel or user from your server ignore list')
						.addChannelOption((channel) =>
							channel
								.setName('channel')
								.setDescription('The channel to stop ignoring')
								.addChannelTypes(...allowedChannelTypes),
						)
						.addUserOption((user) => user.setName('user').setDescription('The user to stop ignoring')),
				)
				.addSubcommand((list) =>
					list
						.setName('list')
						.setDescription('Lists all channels and users that you are ignoring from this server'),
				)
				.addSubcommand((clear) => clear.setName('clear').setDescription('Clears your server ignore list')),
		);

		registry.registerContextMenuCommand((ignoreUser) =>
			ignoreUser.setName('Ignore user').setType(ApplicationCommandType.User).setDMPermission(false),
		);

		registry.registerContextMenuCommand((ignoreUser) =>
			ignoreUser.setName('Remove ignored user').setType(ApplicationCommandType.User).setDMPermission(false),
		);
	}

	private async addSubcommand(
		messageOrInteraction:
			| Message<true>
			| Subcommand.ChatInputCommandInteraction<'cached'>
			| Subcommand.ContextMenuCommandInteraction<'cached'>,
		args: BlockArgument[],
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
								'You need to provide at least one user or channel to add to your ignore list',
							),
						],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const userId = resolveUserIdFromMessageOrInteraction(messageOrInteraction);
		const member = await getDatabaseMember(messageOrInteraction.guildId, userId);
		const added: string[] = [];
		const ignored: string[] = [];
		const seen = new Set<string>();

		const userIdsToAdd: string[] = [];
		const channelIdsToAdd: string[] = [];

		for (const { type, value } of args) {
			// ignore duplicate entries
			if (seen.has(value.id)) {
				continue;
			}

			seen.add(value.id);

			switch (type) {
				case 'user': {
					// Check that the user isn't the command runner - that's useless
					if (value.id === userId) {
						ignored.push(`- ${userMention(value.id)}\n└ You cannot ignore yourself`);
						continue;
					}

					// Check that the user isn't already ignored
					if (member.ignoredUsers.includes(value.id)) {
						ignored.push(`- ${userMention(value.id)}\n└ This user is already ignored`);
						continue;
					}

					// Add them in the database
					added.push(`- ${userMention(value.id)}`);
					userIdsToAdd.push(value.id);
					break;
				}
				case 'channel': {
					// Check that the channel isn't already ignored
					if (member.ignoredChannels.includes(value.id)) {
						ignored.push(`- ${channelMention(value.id)}\n└ This channel is already ignored`);
						continue;
					}

					// Add it in the database
					added.push(`- ${channelMention(value.id)}`);
					channelIdsToAdd.push(value.id);
					break;
				}
			}
		}

		if (added.length === 0 && ignored.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('There were no changes done to your ignore list.')],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		if (userIdsToAdd.length) {
			await this.container.prisma.guildIgnoredUser.createMany({
				data: userIdsToAdd.map((ignoredUserId) => ({
					guildId: messageOrInteraction.guildId,
					userId,
					ignoredUserId,
				})),
			});
		}

		if (channelIdsToAdd.length) {
			await this.container.prisma.guildIgnoredChannel.createMany({
				data: channelIdsToAdd.map((ignoredChannelId) => ({
					guildId: messageOrInteraction.guildId,
					userId,
					ignoredChannelId,
				})),
			});
		}

		const embed = createInfoEmbed(['Here are the changes done to your ignore list:'].join('\n'));

		if (added.length) {
			embed.addFields({ name: 'Added', value: added.join('\n') });
		}

		if (ignored.length) {
			embed.addFields({ name: 'Ignored', value: ignored.join('\n') });
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
		args: BlockArgument[],
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
								'You need to provide at least one user or channel to remove from your ignore list',
							),
						],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const userId = resolveUserIdFromMessageOrInteraction(messageOrInteraction);
		const member = await getDatabaseMember(messageOrInteraction.guildId, userId);
		const removed: string[] = [];
		const ignored: string[] = [];
		const seen = new Set<string>();

		const userIdsToRemove: string[] = [];
		const channelIdsToRemove: string[] = [];

		for (const { type, value } of args) {
			// ignore duplicate entries
			if (seen.has(value.id)) {
				continue;
			}

			seen.add(value.id);

			switch (type) {
				case 'user': {
					// Check that the user isn't the command runner - that's useless
					if (value.id === userId) {
						ignored.push(`- ${userMention(value.id)}\n└ You cannot un-ignore yourself`);
						continue;
					}

					// Check that the user isn't already ignored
					if (!member.ignoredUsers.includes(value.id)) {
						ignored.push(`- ${userMention(value.id)}\n└ This user is not ignored`);
						continue;
					}

					// Add them in the database
					removed.push(`- ${userMention(value.id)}`);
					userIdsToRemove.push(value.id);
					break;
				}
				case 'channel': {
					// Check that the channel isn't already ignored
					if (!member.ignoredChannels.includes(value.id)) {
						ignored.push(`- ${channelMention(value.id)}\n└ This channel is not ignored`);
						continue;
					}

					// Add it in the database
					removed.push(`- ${channelMention(value.id)}`);
					channelIdsToRemove.push(value.id);
					break;
				}
			}
		}

		if (removed.length === 0 && ignored.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('There were no changes done to your ignore list.')],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		if (userIdsToRemove.length) {
			await this.container.prisma.guildIgnoredUser.deleteMany({
				where: {
					guildId: messageOrInteraction.guildId,
					userId,
					ignoredUserId: { in: userIdsToRemove },
				},
			});
		}

		if (channelIdsToRemove.length) {
			await this.container.prisma.guildIgnoredChannel.deleteMany({
				where: {
					guildId: messageOrInteraction.guildId,
					userId,
					ignoredChannelId: { in: channelIdsToRemove },
				},
			});
		}

		const embed = createInfoEmbed(['Here are the changes done to your ignore list:'].join('\n'));

		if (removed.length) {
			embed.addFields({ name: 'Removed', value: removed.join('\n') });
		}

		if (ignored.length) {
			embed.addFields({ name: 'Ignored', value: ignored.join('\n') });
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
									ServerIgnoreListClearIdFactory.encodeId({
										userId: id,
										action: ServerIgnoreListClearCustomIdActions.Confirm,
									}).unwrap(),
								)
								.setEmoji('🧹'),
							new ButtonBuilder()
								.setLabel('Cancel')
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(
									ServerIgnoreListClearIdFactory.encodeId({
										userId: id,
										action: ServerIgnoreListClearCustomIdActions.Reject,
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
		const member = await getDatabaseMember(messageOrInteraction.guildId, userId);

		if (member.ignoredUsers.length === 0 && member.ignoredChannels.length === 0) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage,
					options: {
						embeds: [createInfoEmbed('You are not ignoring any users or channels from this server.')],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		await 1;
	}

	private resolveChatInputCommandArgs(interaction: Subcommand.ChatInputCommandInteraction<'cached'>) {
		const args: BlockArgument[] = [];

		const maybeChannel = interaction.options.getChannel('channel', false, allowedChannelTypes);
		const maybeUser = interaction.options.getUser('user', false);

		if (maybeChannel) {
			args.push({ type: 'channel', value: maybeChannel });
		}

		if (maybeUser) {
			args.push({ type: 'user', value: maybeUser });
		}

		return args;
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	private UserOrChannelArg = Args.make<BlockArgument>(async (parameter, { argument, message }) => {
		const maybeChannel = Resolvers.resolveGuildChannel(parameter, message.guild!);

		if (maybeChannel.isOkAnd((channel) => allowedChannelTypes.includes(channel.type as any))) {
			return Args.ok({ type: 'channel', value: maybeChannel.unwrap() as AllowedChannel });
		}

		const maybeUser = await Resolvers.resolveUser(parameter);

		if (maybeUser.isOk()) {
			return Args.ok({ type: 'user', value: maybeUser.unwrap() });
		}

		return Args.error({ argument, parameter });
	});

	private async resolveMessageArgs(args: Args) {
		const resolved: BlockArgument[] = [];

		while (!args.finished) {
			const arg = await args.pickResult(this.UserOrChannelArg);

			arg.match({
				ok(value) {
					resolved.push(value);
				},
				err() {
					args.next();
				},
			});
		}

		return resolved;
	}
}
