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
		const members = [...msg.guild.members.filter(m => m.configs.words.length).filter(m => m.id !== msg.author.id).values()];
		const content = msg.content ? msg.content.toLowerCase().split(/\s+/) : [];
		members.forEach(async member => {
			if ((member.configs.blacklistedUsers && member.configs.blacklistedUsers.includes(msg.author.id)) || (member.configs.blacklistedChannels && member.configs.blacklistedChannels.includes(msg.channel.id))) return;
			const foundWord = member.configs.words.find(word => content.includes(word));
			if (foundWord) this._highlight(msg, member, foundWord);
		});
	}

	async _highlight (msg, member, chosenWord) {
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
		member.user.send(`You were mentioned in ${msg.channel} (#${msg.channel.name}) of ${msg.guild} using the highlight word **${chosenWord}**`, {
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
