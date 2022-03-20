import { ApplyOptions } from '@sapphire/decorators';
import { Event, EventOptions } from '@sapphire/framework';
import { Timestamp } from '@sapphire/time-utilities';
import { Message, MessageEmbed, TextChannel, Util } from 'discord.js';
import { WorkerType } from '../lib/internals/HighlightManager.mjs';
import type { ParsedHighlightData } from '../lib/types/WorkerTypes.mjs';

const timestamp = new Timestamp('HH[:]mm');

@ApplyOptions<EventOptions>({ event: 'message' })
export default class extends Event {
	public async run(message: Message) {
		const { client } = this.context;

		// If we are not in a guild, return early
		if (!message.guild) return;

		// If the message was written by a bot, or a webhook, return early
		if (message.author.bot || message.webhookID) return;

		// Check if we have a content, just in case
		if (message.content.length === 0) return;

		const sent = new Set<string>();
		const scheduledActions: Promise<void>[] = [];

		const [parsedRegularExpressions, parsedWords] = await client.highlightManager.parseHighlight(message);

		// If we have no parsed results, return early
		if (parsedRegularExpressions.results.length === 0 && parsedWords.results.length === 0) return;

		const previousChannelMessages: Array<[string, string]> = [];
		if ((message.channel as TextChannel).permissionsFor(message.guild.me!)!.has('READ_MESSAGE_HISTORY'))
			previousChannelMessages.push(...(await this.fetchPreviousMessages(message)));

		for (const data of parsedRegularExpressions.results) {
			if (sent.has(data.memberID)) continue;
			sent.add(data.memberID);
			scheduledActions.push(
				this.handleHighlight(message, previousChannelMessages.slice(), data, WorkerType.RegularExpression),
			);
		}

		for (const data of parsedWords.results) {
			if (sent.has(data.memberID)) continue;
			sent.add(data.memberID);
			scheduledActions.push(this.handleHighlight(message, previousChannelMessages.slice(), data, WorkerType.Word));
		}

		await Promise.allSettled(scheduledActions);
	}

	private async handleHighlight(
		message: Message,
		previous: [string, string][],
		{ memberID, parsedContent, trigger }: ParsedHighlightData,
		type: WorkerType,
	) {
		if (!message.guild) throw new Error('Unreachable');
		// If we don't have a member, exit early | This should never happen
		const member = await message.guild.members.fetch(memberID).catch(() => null);
		if (!member) {
			message.client.highlightManager.removeTriggerForUser(message.guild.id, memberID, trigger);
			return;
		}

		// If the member cannot see the channel, return early
		if (!(message.channel as TextChannel).permissionsFor(member)?.has('VIEW_CHANNEL')) return;

		// If the user is mentioned, prevent a highlight from occurring
		if (message.mentions.users.has(memberID)) return;

		// If the member blacklisted the user OR the channel the message was sent in, prevent a highlight from occurring

		const { ignoredChannels, ignoredUsers } = await message.client.prisma.members.findFirst({
			where: { guildID: message.guild.id, userID: memberID },
			rejectOnNotFound: true,
		});

		if (ignoredUsers.includes(message.author.id) || ignoredChannels.includes(message.channel.id)) return;

		// Create the embed
		const embed = this._prepareEmbed(previous, message, parsedContent);
		try {
			await member.send(
				[
					'Your highlight',
					type === WorkerType.RegularExpression ? 'regular expression' : 'word',
					`**${Util.escapeMarkdown(trigger)}** was mentioned by **${Util.escapeMarkdown(message.author.tag)}**`,
					// eslint-disable-next-line @typescript-eslint/no-base-to-string
					`in ${message.channel} of ${message.guild}`,
				].join(' '),
				embed,
			);
		} catch {
			message.client.emit('wtf', `Failed to DM ${memberID} in ${message.guild.id} for trigger ${trigger}`);
		}
	}

	private async fetchPreviousMessages(message: Message) {
		const returnData: Array<[string, string]> = [];
		const messages = await message.channel.messages.fetch({ limit: 5, before: message.id });
		for (const data of messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).values()) {
			returnData.push([
				`[${timestamp.displayUTC(data.createdTimestamp)} UTC] ${Util.escapeMarkdown(data.author.tag)}`,
				data.content.length === 0
					? data.attachments.size === 0
						? `*Message has an embed*\n*Click **[here](${data.url})** to see the message*`
						: `*Message has an attachment*\n*Click **[here](${data.url})** to see the message*`
					: data.content.length >= 600
					? `*This message's content was too large.*\n*Click **[here](${data.url})** to see the message*`
					: data.content,
			]);
		}
		return returnData;
	}

	private _prepareEmbed(previous: Array<[string, string]>, message: Message, parsedContent: string) {
		const embed = new MessageEmbed()
			.setColor(0x3669fa)
			.setAuthor(Util.escapeMarkdown(message.author.tag), message.author.displayAvatarURL())
			.setTimestamp()
			.setDescription(`**[Click here to jump to the highlight message](${message.url})**`)
			.setFooter('Highlighted');

		if (previous.length) for (const [name, value] of previous) embed.addField(name, value);

		embed.addField(
			`__**[${timestamp.displayUTC(message.createdTimestamp)} UTC] ${Util.escapeMarkdown(message.author.tag)}**__`,
			parsedContent,
		);

		return embed;
	}
}
