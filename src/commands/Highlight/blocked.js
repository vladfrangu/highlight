const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: `Shows all your highlighted words in a list`,
			aliases: ["list"],
		});
	}

	async run (msg) {
		if (!(msg.member.configs.blacklistedUsers || msg.member.configs.blacklistedChannels || []).length) {
			return msg.send({
				embed: {
					color: 0xCC0F16,
					description: `You don't have anyone blacklisted!`,
				},
			});
		}
		const blacklistedUsers = msg.member.configs.blacklistedUsers ? (await Promise.all(msg.member.configs.blacklistedUsers.map(async id => `• ${(this.client.users.get(id) || await this.client.users.fetch(id)).tag || "Invalid User#0000"}`))).join("\n") : "";
		const blacklistedChannels = msg.member.configs.blacklistedChannels ? msg.member.configs.blacklistedChannels.map(id => `• #${msg.guild.channels.get(id).name} (<#${id}>)`).join("\n") : "";
		const fields = [];
		blacklistedUsers.length && fields.push({
			name: `Blacklisted Users`,
			value: blacklistedUsers,
		});
		blacklistedChannels.length && fields.push({
			name: `Blacklisted Channels`,
			value: blacklistedChannels,
		});
		return msg.send(null, {
			embed: {
				color: 0x3669FA,
				fields,
			},
		});
	}
};
