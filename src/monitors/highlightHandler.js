const { Monitor } = require("klasa");
const moment = require("moment-timezone"); // Till klasa has timezone support

module.exports = class extends Monitor {
	constructor (...args) {
		super(...args, {
			enabled: true,
			ignoreBots: true,
			ignoreSelf: true,
			ignoreEdits: true,
			ignoreOthers: false,
		});
	}

	async run (msg) {
		if (!msg.guild) return;
		const responded = new Set();
		if (msg.content) {
			for (const word of msg.content.toLowerCase().split(/\s+/)) {
				const members = msg.guild.words.get(word);
				if (!members) continue;
				for (const member of members) {
					if (responded.has(member)) continue;
					this._highlight(msg, member, word);
					responded.add(member);
				}
			}
		}
	}

	async _highlight (msg, member, chosenWord) {
		if (member.configs.blacklistedUsers.includes(msg.author.id) || member.configs.blacklistedChannels.includes(msg.channel.id) || member.id === msg.author.id) return;
		const messages = [];
		if (msg.channel.permissionsFor(msg.guild.me).has("READ_MESSAGE_HISTORY")) {
			const tempMessages = await msg.channel.messages.fetch({ limit: 3, before: msg.id });
			for (const message of tempMessages.values()) {
				messages.push([
					`[${moment(message.createdAt).tz("Europe/London").format("HH[:]mm[:]ss")} UTC]`,
					`${message.author.tag.replace(/(\_|\*|\`|\~)/g, "\\$1")}:`,
					`${message.content}`,
				].join(" "));
			}
		}
		messages.push([
			`[${moment(msg.createdAt).tz("Europe/London").format("HH[:]mm[:]ss")} UTC]`,
			`${msg.author.tag.replace(/(\_|\*|\`|\~)/g, "\\$1")}:`,
			`${msg.content}`,
		].join(" "));
		member.send(`You were mentioned in ${msg.channel} (#${msg.channel.name}) of ${msg.guild} using the highlight word **${chosenWord}**`, {
			embed: {
				color: 0x3669FA,
				description: `${messages.join("\n")}`,
				timestamp: new Date,
				footer: {
					text: `Triggered`,
				},
			},
		}).catch(() => {});
	}
};
