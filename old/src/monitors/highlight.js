const { Util: { escapeMarkdown } } = require("discord.js");
const { Monitor } = require("klasa");
const moment = require("moment-timezone"); // Till klasa has timezone support
const { STRIP } = require("../lib/Constants");

module.exports = class extends Monitor {
	constructor (...args) {
		super(...args, {
			enabled: true,
			ignoreBots: true,
			ignoreSelf: true,
			ignoreEdits: true,
			ignoreOthers: false,
		});

		this.cache = new Map();
	}

	async run (msg) {
		if (!msg.guild) return;
		if (msg.content) {
			const responded = new Set();
			for (let [regex, members] of msg.guild.regexes) {
				regex = this.getRegex(regex);
				if (regex.test(msg.content)) {
					for (const member of members) {
						if (responded.has(member)) continue;
						this._highlightRegex(msg, member, regex);
						responded.add(member);
					}
				}
			}
			for (const word of msg.content.toLowerCase().split(/\s*\b\s*/)) {
				const members = msg.guild.words.get(word);
				if (!members) continue;
				for (const member of members) {
					if (responded.has(member)) continue;
					this._highlightWord(msg, member, word);
					responded.add(member);
				}
			}
		}
	}

	getRegex (regex) {
		const item = this.cache.get(regex);
		if (item) return item;
		try {
			const newExp = new RegExp(regex, "gi");
			this.cache.set(regex, newExp);
			return newExp;
		} catch (error) {
			return { test: () => false };
		}
	}

	async _highlightWord (msg, member, chosenWord) {
		const _member = await msg.guild.members.fetch(member).catch(() => null);
		if (!_member) return msg.guild.removeCachedWord(chosenWord, member);
		if (!msg.guild.members.has(_member.id)) return;
		if (msg.mentions.users.has(_member.id)) return;
		if (_member.settings.blacklistedUsers.includes(msg.author.id) || _member.settings.blacklistedChannels.includes(msg.channel.id) || _member.id === msg.author.id) return;
		if (!msg.channel.permissionsFor(_member).has("VIEW_CHANNEL")) return;
		const messages = [...await this._fetchMessagesBefore(msg)];
		messages.push([
			`[**${moment(msg.createdTimestamp).tz("Europe/London").format("HH[:]mm[:]ss")} UTC**]`,
			`${msg.author.tag.replace(STRIP, "\\$1")}:`,
			msg.content,
		].join(" "));
		member.send(`In ${msg.channel} of ${msg.guild}, **${msg.author.tag}** mentioned the highlight word **${chosenWord}**`, {
			embed: {
				color: 0x3669FA,
				description: `${messages.join("\n")}`,
				fields: [{ name: "Jump To Highlight Message", value: `**${msg.url}**` }],
				timestamp: new Date(),
				footer: {
					text: `Highlighted`,
				},
			},
		}).catch(() => {});
	}

	async _highlightRegex (msg, member, chosenRegex) {
		const userFriendlyRegex = chosenRegex.source;
		const _member = await msg.guild.members.fetch(member).catch(() => null);
		if (!_member) return msg.guild.removeCachedRegexp(userFriendlyRegex, member);
		if (!msg.guild.members.has(_member.id)) return;
		if (msg.mentions.users.has(_member.id)) return;
		if (_member.settings.blacklistedUsers.includes(msg.author.id) || _member.settings.blacklistedChannels.includes(msg.channel.id) || _member.id === msg.author.id) return;
		if (!msg.channel.permissionsFor(_member).has("VIEW_CHANNEL")) return;
		const messages = [...await this._fetchMessagesBefore(msg)];
		messages.push([
			`[**${moment(msg.createdTimestamp).tz("Europe/London").format("HH[:]mm[:]ss")} UTC**]`,
			`${msg.author.tag.replace(STRIP, "\\$1")}:`,
			msg.content,
		].join(" "));
		member.send(`In ${msg.channel} of ${msg.guild}, **${msg.author.tag}** mentioned the highlight regex **${escapeMarkdown(userFriendlyRegex)}**`, {
			embed: {
				color: 0x3669FA,
				description: `${messages.join("\n")}`,
				fields: [{ name: "Jump To Highlight Message", value: `**${msg.url}**` }],
				timestamp: new Date(),
				footer: {
					text: `Highlighted`,
				},
			},
		}).catch(() => {});
	}

	async _fetchMessagesBefore (msg) {
		const messages = [];
		if (msg.channel.permissionsFor(msg.guild.me).has("READ_MESSAGE_HISTORY")) {
			const tempMessages = await msg.channel.messages.fetch({ limit: 3, before: msg.id });
			for (const message of tempMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).values()) {
				messages.push([
					`[${moment(message.createdTimestamp).tz("Europe/London").format("HH[:]mm[:]ss")} UTC]`,
					`${message.author.tag.replace(STRIP, "\\$1")}:`,
					message.content.length === 0 ? "*Message has embed or attachment*" : message.content.length >= 600 ? `*The contents of this message were too large. Please click **[here](${message.url})** to see the message*` : message.content,
				].join(" "));
			}
		}
		return messages;
	}
};
