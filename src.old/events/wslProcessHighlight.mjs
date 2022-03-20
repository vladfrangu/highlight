'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const klasa_1 = require('klasa');
const discord_js_1 = require('discord.js');
const moment_timezone_1 = __importDefault(require('moment-timezone'));

const excludeFromParsing = ['130175406673231873'];

class default_1 extends klasa_1.Monitor {
	constructor() {
		super(...arguments);
		this.ignoreBots = false;
		this.ignoreEdits = true;
		this.ignoreSelf = true;
		this.ignoreOthers = false;
		this.ignoreWebhooks = false;
	}
	async run(message) {
		if (!message.guild) return null;
		if (message.content.length === 0) return null;
		if (excludeFromParsing.includes(message.author.id)) return null;
		if (
			(message.author.bot || message.webhookID) &&
			![
				// TURBO #0420
				'751500024348934164',
				'837096413665296424',
				'837096621610369044',
				// g3rd#9268
				'830179100114157608',
				'828255477506244628',
				'827114559486951514',
				'825052409323061298',
				'880373442921234492',
				'880553941547487232',
				'880557173950808125',
				// rudolfthered#9268
				'917658171244445706',
				'917658224986042378',
				'917658640779993108',
				'917658296121442344',
				'917658333505273926',
				'917658378489200662',
				'917658428120399993',
			].includes(message.channel.id)
		)
			return null;
		const { regularExpressions, words } = message.guild;
		if (words.size === 0 && regularExpressions.size === 0) return null;
		const sent = new Set();
		const scheduledActions = [];
		const [parsedRegularExpressions, parsedWords] = await this.client.workers.parseHighlight(message);
		if (parsedRegularExpressions.results.length === 0 && parsedWords.results.length === 0) return null;
		const previousChannelMessages = [];
		if (message.channel.permissionsFor(message.guild.me).has('READ_MESSAGE_HISTORY'))
			previousChannelMessages.push(...(await this._fetchPreviousMessages(message)));
		for (const data of parsedRegularExpressions.results) {
			if (sent.has(data.memberID)) continue;
			sent.add(data.memberID);
			scheduledActions.push(
				this._handleHighlight(message, previousChannelMessages.slice(), data, 'regularExpressions'),
			);
		}
		for (const data of parsedWords.results) {
			if (sent.has(data.memberID)) continue;
			sent.add(data.memberID);
			scheduledActions.push(this._handleHighlight(message, previousChannelMessages.slice(), data, 'words'));
		}
		await Promise.all(scheduledActions);
		return true;
	}
	async _handleHighlight(message, previous, { memberID, parsedContent, trigger }, type) {
		var _a;
		if (!message.guild) throw new Error('Unreachable');
		const member = await message.guild.members.fetch(memberID).catch(() => null);
		if (!member) {
			message.guild[type === 'regularExpressions' ? 'removeRegularExpression' : 'removeWord'](trigger, memberID);
			return;
		}
		if (!((_a = message.channel.permissionsFor(member)) === null || _a === void 0 ? void 0 : _a.has('VIEW_CHANNEL')))
			return;
		if (message.mentions.users.has(memberID)) return;
		const [blacklistedUsers, blacklistedChannels] = member.settings.pluck('blacklist.users', 'blacklist.channels');
		if (blacklistedUsers.includes(message.author.id) || blacklistedChannels.includes(message.channel.id)) return;
		const embed = this._prepareEmbed(previous, message, parsedContent);
		try {
			await member.send(
				[
					'Your highlight',
					type === 'regularExpressions' ? 'regular expression' : 'word',
					`**${discord_js_1.Util.escapeMarkdown(trigger)}** was mentioned by **${discord_js_1.Util.escapeMarkdown(
						message.author.tag,
					)}**`,
					`in ${message.channel} of ${message.guild}`,
				].join(' '),
				embed,
			);
		} catch {
			this.client.emit(
				'wtf',
				`Failed to DM ${memberID} in ${message.guild.id} for trigger ${trigger} by ${message.author.id}`,
			);
		}
	}
	async _fetchPreviousMessages(message) {
		const returnData = [];
		const messages = await message.channel.messages.fetch({ limit: 5, before: message.id });
		for (const data of messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).values()) {
			returnData.push([
				`[${moment_timezone_1
					.default(data.createdTimestamp)
					.tz('Europe/London')
					.format('HH[:]mm')} UTC] ${discord_js_1.Util.escapeMarkdown(data.author.tag)}`,
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
	_prepareEmbed(previous, message, parsedContent) {
		const embed = new discord_js_1.MessageEmbed()
			.setColor(0x3669fa)
			.setAuthor(
				discord_js_1.Util.escapeMarkdown(message.author.tag) + ` (${message.author.id})`,
				message.author.displayAvatarURL({ size: 128, format: 'png', dynamic: true }),
			)
			.setTimestamp()
			.setDescription(`**[Click here to jump to the highlight message](${message.url})**`)
			.setFooter('Highlighted');
		for (const [name, value] of previous) embed.addField(name, value);
		embed.addField(
			`__**[${moment_timezone_1
				.default(message.createdTimestamp)
				.tz('Europe/London')
				.format('HH[:]mm')} UTC] ${discord_js_1.Util.escapeMarkdown(message.author.tag)}**__`,
			parsedContent,
		);
		return embed;
	}
}
exports.default = default_1;
//# sourceMappingURL=highlight.js.map
