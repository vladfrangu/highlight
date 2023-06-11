import { getUserTag } from '#utils/tags';
import { GuildNotificationStyle, type GuildSetting } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Message, PermissionFlagsBits } from 'discord.js';

// For each message received:

// Step 4: iterate over each result and do the steps per result, giving regex priority over words

// Steps per result
// Step 1. Ensure the user wasn't mentioned in the message, or the message isn't in reply to the user
// Step 2. Ensure the member that should be highlighted can see the channel
// Step 3. Ensure the member that should be highlighted hasn't also opted out
// Step 3.1. If channel is NSFW, ensure the user opted into getting highlights from NSFW channels
// Step 4. Ensure the author of the message that should be highlighted for the member or the channel is not ignored
// Step 5. Ensure the users highlight after afk delay in guild was passed
// Step 6. Create embed based on the guild's style
// Step 6.1. Regardless of the guild style that is set, if the member that got highlighted cannot read the channel history, then they won't get extra context

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

		// Step 3.1.2: Fetch the guild settings, as we will need them for the next steps
		const guildSettings =
			(await this.container.prisma.guildSetting.findFirst({
				where: { guildId: message.guildId },
			})) ??
			({
				guildId: message.guildId,
				// KEEP IN SYNC WITH THE DEFAULTS IN schema.prisma
				notificationStyle: GuildNotificationStyle.WithContextAndAuthor,
			} satisfies GuildSetting);

		// Step 3.2: Get channel history if possible, for future processing
		const history = await this.fetchHistory(message, guildSettings);
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

		// Step 3.2.1: If the bot can't read the channel history, then we can't get any context for the user
		if (!message.channel.permissionsFor(me, true).has(PermissionFlagsBits.ReadMessageHistory)) {
			return [];
		}

		// Step 3.2.2: Fetch the last 5 messages before the message that was sent
		const messages = (await message.channel.messages.fetch({ limit: 5, before: message.id })).reverse();
		const result: [fieldTitle: string, fieldValue: string][] = [];

		for (const fetchedMessage of messages.values()) {
			const tag = getUserTag(fetchedMessage.author);
		}

		return result;
	}
}
