import { WorkerType, type ParsedHighlightData } from '#types/WorkerTypes';
import { UnknownUserTag, getUserTag } from '#utils/tags';
import { GuildNotificationStyle, type GuildSetting, type Member, type User, type UserActivity } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Events,
	Message,
	PermissionFlagsBits,
	TimestampStyles,
	bold,
	escapeMarkdown,
	hyperlink,
	inlineCode,
	italic,
	time,
} from 'discord.js';

function highlightShouldGetUserInfo(guildSettings: GuildSetting) {
	return (
		guildSettings.notificationStyle === GuildNotificationStyle.WithContextAndAuthor ||
		guildSettings.notificationStyle === GuildNotificationStyle.WithoutContextButWithAuthor
	);
}

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class HighlightParser extends Listener<typeof Events.MessageCreate> {
	public override async run(message: Message) {
		// Step 1: check that the message was received in a guild
		if (!message.inGuild()) {
			return;
		}

		// Step 2.1: check if we have any content to parse (content !== '')
		if (message.content.length === 0) {
			return;
		}

		// Step 2.2: Check if the message was sent by a bot or webhook, and the channel allows bot messages to be parsed
		if (message.author.bot || message.webhookId || message.author.system) {
			const data = await this.container.prisma.channelWithBotParsing.findFirst({
				where: { channelId: message.channelId },
			});

			// If we don't have a DB entry for this channel, bot/webhook/system messages should be ignored
			if (data === null) {
				return;
			}
		}

		// Step 2.3: check if author opted out
		const data = await this.container.prisma.user.findFirst({
			where: { id: message.author.id },
		});

		if (data?.optedOut) {
			return;
		}

		// Step 3.1.1: Get results from highlight manager
		const [wordsResult, regularExpressionsResult] = await this.container.highlightManager.parseHighlight(message);

		// Step 3.1.2: If there are no results, then we don't need to do anything
		if (wordsResult.results.length === 0 && regularExpressionsResult.results.length === 0) {
			return;
		}

		// Step 3.1.3: Fetch the guild settings, as we will need them for the next steps
		const guildSettings =
			(await this.container.prisma.guildSetting.findFirst({
				where: { guildId: message.guildId },
			})) ??
			({
				guildId: message.guildId,
				// KEEP IN SYNC WITH THE DEFAULTS IN schema.prisma
				notificationStyle: GuildNotificationStyle.WithContextAndAuthor,
			} satisfies GuildSetting);

		// Step 3.2.1: Get channel history if possible, for future processing
		const history = await this.fetchHistory(message, guildSettings);

		// Step 3.2.2: Prepare the promises that need to be executed for the results, ignoring multiple highlights
		const promises: Promise<unknown>[] = [];
		const handledMemberIds = new Set<string>();

		// Step 3.2.3: Fetch all database data for the highlighted members
		const allHighlightedMembers = new Set([...regularExpressionsResult.memberIds, ...wordsResult.memberIds]);
		const highlightedMembersFromDatabase = await this.fetchAllMembersFromDatabase(
			message.guildId,
			message.channelId,
			allHighlightedMembers,
		);

		// Step 3.2.3: Iterate over the regular expression results first and execute the steps per result
		for (const result of regularExpressionsResult.results) {
			if (handledMemberIds.has(result.memberId)) {
				continue;
			}

			handledMemberIds.add(result.memberId);

			promises.push(
				this.handleHighlight(
					message,
					guildSettings,
					history,
					result,
					highlightedMembersFromDatabase,
					WorkerType.RegularExpression,
				),
			);
		}

		// Step 3.2.4: Iterate over the words results second and execute the steps per result
		for (const result of wordsResult.results) {
			if (handledMemberIds.has(result.memberId)) {
				continue;
			}

			handledMemberIds.add(result.memberId);

			promises.push(
				this.handleHighlight(message, guildSettings, history, result, highlightedMembersFromDatabase, WorkerType.Word),
			);
		}

		// Step 3.2.5: Wait for all promises to resolve
		await Promise.allSettled(promises);
	}

	private async fetchHistory(message: Message<true>, guildSettings: GuildSetting) {
		// Step 3.2.1: If the guild opted out from getting context, then we don't need to fetch the history
		if (
			guildSettings.notificationStyle === GuildNotificationStyle.WithoutContextButWithAuthor ||
			guildSettings.notificationStyle === GuildNotificationStyle.WithoutContextOrAuthor
		) {
			return [];
		}

		const me = await message.guild.members.fetchMe();

		// Step 3.2.2: If the bot can't read the channel history, then we can't get any context for the user
		if (!message.channel.permissionsFor(me, true).has(PermissionFlagsBits.ReadMessageHistory)) {
			return [];
		}

		// Step 3.2.3: Fetch the last 5 messages before the message that was sent and process them
		const messages = (await message.channel.messages.fetch({ limit: 5, before: message.id })).reverse();
		const result: [fieldTitle: string, fieldValue: string][] = [];

		for (const fetchedMessage of messages.values()) {
			result.push(this.resolveEmbedFieldContent(fetchedMessage, guildSettings));
		}

		return result;
	}

	private resolveEmbedFieldContent(
		message: Message,
		guildSettings: GuildSetting,
	): [fieldTitle: string, fieldValue: string] {
		const tag =
			guildSettings.notificationStyle === GuildNotificationStyle.WithContextButNoAuthor
				? UnknownUserTag
				: getUserTag(message.author);

		const messageHyperlink = `${italic(`Click ${bold(hyperlink('here', message.url))} to view it.`)}`;
		let shortSnippet = '';

		if (message.content.length === 0) {
			// Order: embeds, attachments, stickers, components, ???
			if (message.embeds.length) {
				shortSnippet = `${MessageDescription.Embed}\n${messageHyperlink}`;
			} else if (message.attachments.size) {
				shortSnippet = `${MessageDescription.Attachment}\n${messageHyperlink}`;
			} else if (message.stickers.size) {
				shortSnippet = `${MessageDescription.Sticker}\n${messageHyperlink}`;
			} else if (message.components.length) {
				shortSnippet = `${MessageDescription.Component}\n${messageHyperlink}`;
			} else {
				shortSnippet = `${MessageDescription.Unknown}\n${messageHyperlink}`;
			}
		} else if (message.content.length > 600) {
			shortSnippet = `${italic("This message's content was too large.")}\n${messageHyperlink}`;
		} else {
			shortSnippet = message.content;
		}

		return [`${time(message.createdAt, TimestampStyles.ShortDateTime)} ${tag}`, shortSnippet];
	}

	private async fetchAllMembersFromDatabase(guildId: string, channelId: string, members: Set<string>) {
		const data = await this.container.prisma.member.findMany({
			where: { userId: { in: [...members] }, guildId },
			include: {
				user: {
					include: {
						userActivity: {
							where: { channelId },
						},
					},
				},
			},
		});

		const result = new Map<string, Member & { user: User & { userActivity: UserActivity[] } }>();

		for (const member of data) {
			result.set(member.userId, member);
		}

		return result;
	}

	private async handleHighlight(
		messageThatTriggered: Message<true>,
		guildSettings: GuildSetting,
		channelHistory: [fieldTitle: string, fieldValue: string][],
		highlightResult: ParsedHighlightData,
		allHighlightedMembers: Map<string, Member & { user: User & { userActivity: UserActivity[] } }>,
		workerType: WorkerType,
	) {
		const member = await messageThatTriggered.guild.members.fetch({ user: highlightResult.memberId }).catch(() => null);

		if (!member) {
			this.container.logger.debug(
				`Failed to find member ${highlightResult.memberId} in guild ${messageThatTriggered.guildId} to send highlight`,
			);

			return;
		}

		// Step 1. Ensure the member that should be highlighted can see the channel
		if (!messageThatTriggered.channel.permissionsFor(member, true).has(PermissionFlagsBits.ViewChannel)) {
			this.container.logger.debug(
				`Member ${highlightResult.memberId} can't see channel ${messageThatTriggered.channelId}, will not highlight`,
			);
			return;
		}

		// Step 2. Ensure the user wasn't mentioned in the message, or the message isn't in reply to the user
		if (
			messageThatTriggered.mentions.users.has(highlightResult.memberId) ||
			messageThatTriggered.mentions.repliedUser?.id === highlightResult.memberId
		) {
			this.container.logger.debug(
				`Member ${highlightResult.memberId} was mentioned in message ${messageThatTriggered.id} or was replied to, will not highlight`,
			);
			return;
		}

		const databaseMember = this.getMemberWithUserFromDatabase(
			allHighlightedMembers,
			member.id,
			messageThatTriggered.guildId,
		);

		// Step 3. Ensure the member that should be highlighted hasn't also opted out
		if (databaseMember.user.optedOut) {
			this.container.logger.debug(`Member ${highlightResult.memberId} has opted out, will not highlight`);
			return;
		}

		// Step 3.1. If channel is NSFW, ensure the user opted into getting highlights from NSFW channels
		if (
			messageThatTriggered.channel.isTextBased() &&
			!messageThatTriggered.channel.isThread() &&
			messageThatTriggered.channel.nsfw &&
			!databaseMember.user.adultChannelHighlights
		) {
			this.container.logger.debug(
				`Member ${highlightResult.memberId} has not opted into getting highlights from NSFW channels, will not highlight`,
				`channel: ${messageThatTriggered.channelId}`,
			);
			return;
		}

		// Step 4. Ensure the author of the message that should be highlighted for the member or the channel is not ignored
		if (
			databaseMember.ignoredUsers.includes(messageThatTriggered.author.id) ||
			databaseMember.ignoredChannels.includes(messageThatTriggered.channel.id) ||
			databaseMember.user.globallyIgnoredUsers.includes(messageThatTriggered.author.id)
		) {
			this.container.logger.debug(
				`Member ${highlightResult.memberId} has ignored user ${messageThatTriggered.author.id} or channel ${messageThatTriggered.channel.id}, will not highlight`,
			);
			return;
		}

		// Step 5. Ensure the users highlight after afk delay in guild was passed
		if (databaseMember.user.gracePeriod) {
			// If the user has a grace period set, there _might_ be a UserActivity entry too (and there can only be one)
			// Math is done based on message creation date
			const userActivity = databaseMember.user.userActivity[0];

			if (userActivity) {
				// Get the seconds difference between the message that triggered the highlight and the last activity of the user
				const timeDifference = (messageThatTriggered.createdTimestamp - userActivity.lastActiveAt.getTime()) / 1000;

				// If the difference is less than the grace period, then the user is still in grace period
				if (timeDifference < databaseMember.user.gracePeriod) {
					this.container.logger.debug(
						`Member ${highlightResult.memberId} is still in grace period in channel ${userActivity.channelId}, will not highlight.`,
						`time difference: ${timeDifference};`,
						`grace period: ${databaseMember.user.gracePeriod}`,
					);
					return;
				}
			}
		}

		// Step 6. Create embed based on the guild's style
		const messageAuthorTag = highlightShouldGetUserInfo(guildSettings)
			? getUserTag(messageThatTriggered.author)
			: UnknownUserTag;

		const embed = new EmbedBuilder()
			.setColor(0x3669fa)
			.setAuthor({
				name: messageAuthorTag,
				iconURL:
					messageAuthorTag === UnknownUserTag ? undefined : messageThatTriggered.author.displayAvatarURL({ size: 128 }),
			})
			.setTimestamp(messageThatTriggered.createdTimestamp)
			.setFooter({ text: 'Highlighted' });

		// Step 6.1. Regardless of the guild style that is set, if the member that got highlighted cannot read the channel history, then they won't get extra context
		if (messageThatTriggered.channel.permissionsFor(member, true).has(PermissionFlagsBits.ReadMessageHistory)) {
			for (const [name, value] of channelHistory) {
				embed.addFields({ name, value });
			}
		}

		// Step 6.2: Add the message content
		const tag =
			guildSettings.notificationStyle === GuildNotificationStyle.WithContextButNoAuthor
				? UnknownUserTag
				: getUserTag(messageThatTriggered.author);

		embed.addFields({
			name: `${time(messageThatTriggered.createdAt, TimestampStyles.ShortDateTime)} ${tag}`,
			value: highlightResult.parsedContent,
		});

		// Step 6.3: Prepare message content
		const content = [
			'Your highlight',
			workerType === WorkerType.Word ? 'word' : 'regular expression',
			bold(inlineCode(escapeMarkdown(highlightResult.trigger))),
			'was mentioned by',
			bold(tag),
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			`in ${messageThatTriggered.channel.toString()}`,
		].join(' ');

		// Step 6.4: Prepare the action row with the button
		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setEmoji('👀')
				.setLabel('Jump to message')
				.setStyle(ButtonStyle.Link)
				.setURL(messageThatTriggered.url),
		);

		// Step 7. Send the message
		try {
			await member.send({
				embeds: [embed],
				content,
				components: [row],
			});
		} catch (err) {
			this.container.logger.warn(
				`Failed to send highlight notification to member ${highlightResult.memberId} in guild ${messageThatTriggered.guildId} for trigger ${highlightResult.trigger}`,
				err,
			);
		}
	}

	/**
	 * Gets member data from the database fetch even if the member never interacted with the bot.
	 */
	private getMemberWithUserFromDatabase(
		fetchedMembers: Map<string, Member & { user: User & { userActivity: UserActivity[] } }>,
		memberId: string,
		guildId: string,
	): Member & { user: User & { userActivity: UserActivity[] } } {
		const entry = fetchedMembers.get(memberId);

		if (entry) {
			return entry;
		}

		return {
			guildId,
			ignoredChannels: [],
			ignoredUsers: [],
			regularExpressions: [],
			userId: memberId,
			words: [],
			user: {
				adultChannelHighlights: false,
				globallyIgnoredUsers: [],
				gracePeriod: null,
				id: memberId,
				optedOut: false,
				optedOutAt: null,
				userActivity: [],
			},
		};
	}
}

export const MessageDescription = {
	Embed: italic('Message has embeds'),
	Attachment: italic('Message has attachments'),
	Sticker: italic('Message has stickers'),
	Component: italic('Message has components'),
	Unknown: italic('Message has something unknown'),
};
