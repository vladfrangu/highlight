import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import {
	Emojis,
	HelpDetailedDescriptionReplacers,
	SupportServerButton,
	resolveUserIdFromMessageOrInteraction,
} from '#utils/misc';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand, type SubcommandMappingArray } from '@sapphire/plugin-subcommands';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	PermissionFlagsBits,
	bold,
	channelMention,
	inlineCode,
	italic,
	quote,
	type ApplicationCommandOptionAllowedChannelTypes,
	type CategoryChannel,
	type ForumChannel,
	type Message,
	type NewsChannel,
	type PrivateThreadChannel,
	type PublicThreadChannel,
	type StageChannel,
	type TextChannel,
	type VoiceChannel,
} from 'discord.js';

const allowedChannelTypes = [
	ChannelType.GuildText,
	ChannelType.GuildVoice,
	ChannelType.GuildAnnouncement,
	ChannelType.PublicThread,
	ChannelType.PrivateThread,
	ChannelType.GuildStageVoice,
	ChannelType.GuildForum,
];

type AllowedChannel =
	| CategoryChannel
	| NewsChannel
	| StageChannel
	| TextChannel
	| PrivateThreadChannel
	| PublicThreadChannel<boolean>
	| VoiceChannel
	| ForumChannel;

@ApplyOptions<Subcommand.Options>({
	description: 'Control what channels should trigger highlights if a bot message is sent',
	generateDashLessAliases: true,
	generateUnderscoreLessAliases: true,
	aliases: ['bot_parsing'],
	detailedDescription: [
		quote("Here's how you can add a channel to the list that should trigger highlights if a bot message is sent:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode(`/bot-parsing add channel:<channel>`),
		)}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} bot-parsing add <channel>`),
		)}`,
		'',
		italic(
			`You should replace ${inlineCode(
				'<channel>',
			)} with the channel you want to add, either by mentioning it or by providing its ID.`,
		),
		'',
		quote(
			'You can also remove channels from the list by using the same command, but with the `remove` subcommand instead.',
		),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode(`/bot-parsing remove channel:<channel>`),
		)}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} bot-parsing remove <channel>`),
		)}`,
		'',
		quote('You can also list all channels that are currently in the list by using the `list` subcommand.'),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode(`/bot-parsing list`))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} bot-parsing list`),
		)}`,
	].join('\n'),
	preconditions: ['GuildOnly', 'GuildStaff'],
})
export class BotParsingCommand extends Subcommand {
	public subcommandMappings: SubcommandMappingArray = [
		{
			name: 'add',
			chatInputRun: (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const channel = interaction.options.getChannel('channel', true, allowedChannelTypes);

				return this.addSubcommand(interaction, false, channel);
			},
			messageRun: async (message: Message<true>, args) => {
				const channel = await args.pick('guildChannel');

				if (!allowedChannelTypes.includes(channel.type)) {
					await message.reply(
						withDeprecationWarningForMessageCommands({
							commandName: this.name,
							guildId: message.guildId,
							receivedFromMessage: true,
							options: {
								embeds: [
									createInfoEmbed(
										`The channel you provided is not a valid channel type.\nYou can only add channels that can have messages in them!`,
									),
								],
							},
						}),
					);
					return;
				}

				return this.addSubcommand(message, true, channel as AllowedChannel);
			},
		},
		{
			name: 'remove',
			chatInputRun: (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const channel = interaction.options.getChannel('channel', true, allowedChannelTypes);

				return this.removeSubcommand(interaction, false, channel);
			},
			messageRun: async (message: Message<true>, args) => {
				const channel = await args.pick('guildChannel');

				if (!allowedChannelTypes.includes(channel.type)) {
					await message.reply(
						withDeprecationWarningForMessageCommands({
							commandName: this.name,
							guildId: message.guildId,
							receivedFromMessage: true,
							options: {
								embeds: [
									createInfoEmbed(
										`The channel you provided is not a valid channel type.\nYou can only remove channels that can have messages in them!`,
									),
								],
							},
						}),
					);
					return;
				}

				return this.removeSubcommand(message, true, channel as AllowedChannel);
			},
		},
		{
			name: 'list',
		},
	];

	public async addSubcommand(
		messageOrInteraction: Message<true> | Subcommand.ChatInputCommandInteraction<'cached'>,
		isMessage: boolean,
		channel: AllowedChannel,
	) {
		const guildSettings = await this.container.prisma.guild.findFirstOrThrow({
			where: { guildId: messageOrInteraction.guildId },
			include: { channelsWithBotParsing: true },
		});

		// Incentivize users to donate if they want more channels.
		if (guildSettings.channelsWithBotParsing.length >= guildSettings.channelWithBotParsingsAllowed) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage: isMessage,
					options: {
						embeds: [
							createInfoEmbed(
								`You have reached the maximum amount of channels that bots can trigger highlights for!\n\nConsider donating to the project to receive more channels! Join the support server if you have more questions, we'll gladly help you out with this!`,
							),
						],
						ephemeral: true,
						components: [
							new ActionRowBuilder<ButtonBuilder>().setComponents(
								new ButtonBuilder()
									.setStyle(ButtonStyle.Link)
									.setURL('https://github.com/sponsors/vladfrangu')
									.setLabel('Donate')
									.setEmoji({
										name: '💙',
									}),
								SupportServerButton,
							),
						],
					},
				}),
			);
			return;
		}

		const existingEntry = guildSettings.channelsWithBotParsing.find((entry) => entry.channelId === channel.id);

		if (existingEntry) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage: isMessage,
					options: {
						embeds: [
							createInfoEmbed(
								`The channel you provided is already in the list of channels that bots can trigger highlights for!`,
							),
						],
						ephemeral: true,
					},
				}),
			);
			return;
		}

		await this.container.prisma.channelWithBotParsing.create({
			data: {
				channelId: channel.id,
				userId: resolveUserIdFromMessageOrInteraction(messageOrInteraction),
				guildId: messageOrInteraction.guildId,
			},
		});

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					embeds: [
						createInfoEmbed(
							`The channel ${channel.name} (${channelMention(
								channel.id,
							)}) has been added to the list of channels that bots can trigger highlights for!`,
						),
					],
					ephemeral: true,
				},
			}),
		);
	}

	public async removeSubcommand(
		messageOrInteraction: Message<true> | Subcommand.ChatInputCommandInteraction<'cached'>,
		isMessage: boolean,
		channel: AllowedChannel,
	) {
		const entry = await this.container.prisma.channelWithBotParsing.findFirst({
			where: { channelId: channel.id },
		});

		if (!entry) {
			await messageOrInteraction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: messageOrInteraction.guildId,
					receivedFromMessage: isMessage,
					options: {
						embeds: [
							createInfoEmbed(
								`The channel you provided is not in the list of channels that bots can trigger highlights for!`,
							),
						],
						ephemeral: true,
					},
				}),
			);
			return;
		}

		await this.container.prisma.channelWithBotParsing.delete({ where: { channelId: channel.id } });

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					embeds: [
						createInfoEmbed(
							`The channel ${channel.name} (${channelMention(
								channel.id,
							)}) has been removed from the list of channels that bots can trigger highlights for!`,
						),
					],
					ephemeral: true,
				},
			}),
		);
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand(
			(botParsing) =>
				botParsing
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
					.addSubcommand((add) =>
						add
							.setName('add')
							.setDescription(
								'Add a channel to the list of channels that bots can trigger highlights for',
							)
							.addChannelOption((channel) =>
								channel
									.setName('channel')
									.setDescription('The channel to add')
									.addChannelTypes(
										...(allowedChannelTypes as ApplicationCommandOptionAllowedChannelTypes[]),
									)
									.setRequired(true),
							),
					)
					.addSubcommand((remove) =>
						remove
							.setName('remove')
							.setDescription(
								'Remove a channel from the list of channels that bots can trigger highlights for',
							)
							.addChannelOption((channel) =>
								channel
									.setName('channel')
									.setDescription('The channel to remove')
									.addChannelTypes(
										...(allowedChannelTypes as ApplicationCommandOptionAllowedChannelTypes[]),
									)
									.setRequired(true),
							),
					)
					.addSubcommand((list) =>
						list.setName('list').setDescription('List all channels that can trigger highlights'),
					),
			{
				guildIds: useDevelopmentGuildIds(),
				idHints: [
					// HighlightDev - Sapphire Guild Command
					'1148403709169127556',
				],
			},
		);
	}
}
