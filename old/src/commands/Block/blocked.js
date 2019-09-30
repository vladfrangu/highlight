const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: `Shows your list of blocked members / channels`,
			aliases: ["listblocked"],
		});
		this.needsMember = true;
	}

	async run (msg) {
		if (!(msg.member.settings.blacklistedUsers || msg.member.settings.blacklistedChannels || []).length) {
			return msg.send({
				embed: {
					color: 0xCC0F16,
					description: `You don't have anyone blocked!`,
				},
			});
		}
		const blacklistedUsers = msg.member.settings.blacklistedUsers ? (await Promise.all(msg.member.settings.blacklistedUsers.map(async id => `• ${(this.client.users.get(id) || await this.client.users.fetch(id)).tag || "Invalid User#0000"}`))).join("\n") : "";
		const blacklistedChannels = msg.member.settings.blacklistedChannels ? msg.member.settings.blacklistedChannels.map(id => `• #${msg.guild.channels.get(id).name} (<#${id}>)`).join("\n") : "";
		const fields = [];
		blacklistedUsers.length && fields.push({
			name: `Blocked Users`,
			value: blacklistedUsers,
		});
		blacklistedChannels.length && fields.push({
			name: `Blocked Channels`,
			value: blacklistedChannels,
		});
		return msg.send({
			embed: {
				color: 0x3669FA,
				fields,
			},
		});
	}
};
