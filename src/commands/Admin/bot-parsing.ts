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
	type ForumChannel,
	type GuildTextBasedChannel,
} from 'discord.js';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { Emojis, SupportServerButton, pluralize, resolveUserIdFromMessageOrInteraction } from '#utils/misc';

const allowedChannelTypes = [
	ChannelType.GuildText,
	ChannelType.GuildVoice,
	ChannelType.GuildAnnouncement,
	ChannelType.PublicThread,
	ChannelType.PrivateThread,
	ChannelType.GuildStageVoice,
	ChannelType.GuildForum,
] as const;

type AllowedChannel = ForumChannel | GuildTextBasedChannel;

@ApplyOptions<Subcommand.Options>({
	description: 'Control what channels should trigger highlights if a bot message is sent',
	detailedDescription: [
		quote("Here's how you can add a channel to the list that should trigger highlights if a bot message is sent:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode(`/bot-parsing add channel:<channel>`),
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
		'',
		quote('You can also list all channels that are currently in the list by using the `list` subcommand.'),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode(`/bot-parsing list`))}`,
	].join('\n'),
	preconditions: ['GuildStaff'],
})
export class BotParsingCommand extends Subcommand {
	public subcommandMappings: SubcommandMappingArray = [
		{
			name: 'add',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const channel = interaction.options.getChannel('channel', true, allowedChannelTypes);

				return this.addSubcommand(interaction, channel);
			},
		},
		{
			name: 'remove',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				const channel = interaction.options.getChannel('channel', true, allowedChannelTypes);

				return this.removeSubcommand(interaction, channel);
			},
		},
		{
			name: 'list',
			chatInputRun: async (interaction: Subcommand.ChatInputCommandInteraction<'cached'>) => {
				return this.listSubcommand(interaction);
			},
		},
	];

	public async addSubcommand(interaction: Subcommand.ChatInputCommandInteraction<'cached'>, channel: AllowedChannel) {
		const guildSettings = await this.container.prisma.guild.findFirstOrThrow({
			where: { guildId: interaction.guildId },
			include: { channelsWithBotParsing: true },
		});

		// Incentivize users to donate if they want more channels.
		if (guildSettings.channelsWithBotParsing.length >= guildSettings.channelWithBotParsingsAllowed) {
			await interaction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: interaction.guildId,
					receivedFromMessage: false,
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
			await interaction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: interaction.guildId,
					receivedFromMessage: false,
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
				userId: resolveUserIdFromMessageOrInteraction(interaction),
				guildId: interaction.guildId,
			},
		});

		await interaction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: interaction.guildId,
				receivedFromMessage: false,
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
		interaction: Subcommand.ChatInputCommandInteraction<'cached'>,
		channel: AllowedChannel,
	) {
		const entry = await this.container.prisma.channelWithBotParsing.findFirst({
			where: { channelId: channel.id },
		});

		if (!entry) {
			await interaction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: interaction.guildId,
					receivedFromMessage: false,
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

		await interaction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: interaction.guildId,
				receivedFromMessage: false,
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

	public async listSubcommand(interaction: Subcommand.ChatInputCommandInteraction<'cached'>) {
		const guildSettings = await this.container.prisma.guild.findFirstOrThrow({
			where: { guildId: interaction.guildId },
			include: { channelsWithBotParsing: true },
		});

		if (!guildSettings.channelsWithBotParsing.length) {
			await interaction.reply(
				withDeprecationWarningForMessageCommands({
					commandName: this.name,
					guildId: interaction.guildId,
					receivedFromMessage: false,
					options: {
						embeds: [
							createInfoEmbed(
								`This server has no channels that bots can trigger highlights for!\n\nAs a reminder, you can add up to ${bold(
									inlineCode(`${guildSettings.channelWithBotParsingsAllowed}`),
								)} channels to this list!`,
							),
						],
						ephemeral: true,
					},
				}),
			);

			return;
		}

		const channels: string[] = [];

		for (const channelData of guildSettings.channelsWithBotParsing) {
			const guildChannel = interaction.guild.channels.resolve(channelData.channelId);

			if (!guildChannel) {
				continue;
			}

			channels.push(`- ${channelMention(guildChannel.id)} (${guildChannel.name})`);
		}

		const availableSlots =
			guildSettings.channelWithBotParsingsAllowed - guildSettings.channelsWithBotParsing.length;

		await interaction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: interaction.guildId,
				receivedFromMessage: false,
				options: {
					embeds: [
						createInfoEmbed(
							[
								`This server has ${bold(
									inlineCode(`${guildSettings.channelsWithBotParsing.length}`),
								)} ${pluralize(
									guildSettings.channelsWithBotParsing.length,
									'channel',
									'channels',
								)} that bots can trigger highlights for!`,
								'',
								`Here's the list of channels:`,
								'',
								channels.join('\n'),
								'',
								`There ${pluralize(availableSlots, 'is', 'are')} ${bold(
									inlineCode(`${availableSlots}`),
								)} more ${pluralize(availableSlots, 'slot', 'slots')} available!`,
							].join('\n'),
						),
					],
					ephemeral: true,
				},
			}),
		);
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((botParsing) =>
			botParsing
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addSubcommand((add) =>
					add
						.setName('add')
						.setDescription('Add a channel to the list of channels that bots can trigger highlights for')
						.addChannelOption((channel) =>
							channel
								.setName('channel')
								.setDescription('The channel to add')
								.addChannelTypes(...allowedChannelTypes)
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
								.addChannelTypes(...allowedChannelTypes)
								.setRequired(true),
						),
				)
				.addSubcommand((list) =>
					list.setName('list').setDescription('List all channels that can trigger highlights'),
				),
		);
	}
}
