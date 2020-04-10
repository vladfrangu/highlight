import { KlasaMessage, Monitor } from 'klasa';
import { TextChannel, Util, MessageEmbed } from 'discord.js';
import moment from 'moment-timezone';

import { ParsedHighlightData, GuildWorkerType } from '../lib/types/Misc';

export default class extends Monitor {
	ignoreBots = true;
	ignoreEdits = true;
	ignoreSelf = true;
	ignoreOthers = false;
	ignoreWebhooks = true;

	async run(message: KlasaMessage) {
		// If we are not in a guild, return early
		if (!message.guild) return null;
		// Check if we have a content, just in case
		if (message.content.length === 0) return null;
		// Check if we have any highlight words or regexes
		const { regularExpressions, words } = message.guild;
		if ((words.size === 0) && (regularExpressions.size === 0)) return null;

		const sent = new Set<string>();
		const scheduledActions: Array<Promise<void>> = [];

		const [parsedRegularExpressions, parsedWords] = await this.client.workers.parseHighlight(message);

		// If we have no parsed results, return early
		if ((parsedRegularExpressions.results.length === 0) && (parsedWords.results.length === 0)) return null;

		const previousChannelMessages: Array<[string, string]> = [];
		if ((message.channel as TextChannel).permissionsFor(message.guild.me!)!.has('READ_MESSAGE_HISTORY'))
			previousChannelMessages.push(...await this._fetchPreviousMessages(message));

		for (const data of parsedRegularExpressions.results) {
			if (sent.has(data.memberID)) continue;
			sent.add(data.memberID);
			scheduledActions.push(this._handleHighlight(message, previousChannelMessages.slice(), data, 'regularExpressions'));
		}

		for (const data of parsedWords.results) {
			if (sent.has(data.memberID)) continue;
			sent.add(data.memberID);
			scheduledActions.push(this._handleHighlight(message, previousChannelMessages.slice(), data, 'words'));
		}

		await Promise.all(scheduledActions);
		return true;
	}

	private async _handleHighlight(message: KlasaMessage, previous: Array<[string, string]>, { memberID, parsedContent, trigger }: ParsedHighlightData, type: GuildWorkerType) {
		if (!message.guild) throw new Error('Unreachable');
		// If we don't have a member, exit early | This should never happen
		const member = await message.guild.members.fetch(memberID).catch(() => null);
		if (!member) {
			message.guild[type === 'regularExpressions' ? 'removeRegularExpression' : 'removeWord'](trigger, memberID);
			return;
		}
		// If the member cannot see the channel, return early
		if (!(message.channel as TextChannel).permissionsFor(member)?.has('VIEW_CHANNEL')) return;
		// If the user is mentioned, prevent a highlight from occuring
		if (message.mentions.users.has(memberID)) return;
		// If the member blacklisted the user OR the channel the message was sent in, prevent a highlight from occuring
		const [blacklistedUsers, blacklistedChannels] = member.settings.pluck('blacklist.users', 'blacklist.channels') as string[][];
		if (blacklistedUsers.includes(message.author.id) || blacklistedChannels.includes(message.channel.id)) return;

		const embed = this._prepareEmbed(previous, message, parsedContent);
		try {
			await member.send([
				'Your highlight',
				type === 'regularExpressions' ? 'regular expression' : 'word',
				`**${Util.escapeMarkdown(trigger)}** was mentioned by **${Util.escapeMarkdown(message.author.tag)}**`,
				`in ${message.channel} of ${message.guild}`,
			].join(' '), embed);
		} catch {
			this.client.emit('wtf', `Failed to DM ${memberID} in ${message.guild.id} for trigger ${trigger}`);
		}
	}

	private async _fetchPreviousMessages(message: KlasaMessage) {
		const returnData: Array<[string, string]> = [];
		const messages = await message.channel.messages.fetch({ limit: 5, before: message.id });
		for (const data of messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).values()) {
			returnData.push([
				`[${moment(data.createdTimestamp).tz("Europe/London").format("HH[:]mm")} UTC] ${Util.escapeMarkdown(data.author.tag)}`,
				data.content.length === 0 ?
					data.attachments.size === 0 ?
						`*Message has an embed*\n*Click **[here](${data.url})** to see the message*` :
						`*Message has an attachment*\n*Click **[here](${data.url})** to see the message*` :
					data.content.length >= 600 ?
						`*This message's content was too large. Click **[here](${data.url})** to see the message*` :
						data.content,
			]);
		}
		return returnData;
	}

	private _prepareEmbed(previous: Array<[string, string]>, message: KlasaMessage, parsedContent: string) {
		const embed = new MessageEmbed()
			.setColor(0x3669FA)
			.setAuthor(Util.escapeMarkdown(message.author.tag), message.author.displayAvatarURL())
			.setTimestamp()
			.setDescription(`**[Click here to jump to the highlight message](${message.url})**`)
			.setFooter('Highlighted');

		if (previous.length)
			for (const [name, value] of previous) embed.addField(name, value);

		embed.addField(
			`__**[${moment(message.createdTimestamp).tz("Europe/London").format("HH[:]mm")} UTC] ${Util.escapeMarkdown(message.author.tag)}**__`,
			parsedContent,
		);

		return embed;
	}
}
