const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			cooldown: 5,
			description: "Clears your highlighted regex list",
			aliases: ["cregex", "cregexes", "cr", "crs", "clearr"],
		});
		this.needsMember = true;
	}

	async run (msg) {
		if (!msg.member.settings.regexes.length) {
			return msg.send({
				embed: {
					color: 0xCC0F16,
					description: `You don't have any regexes to clear!`,
				},
			});
		}
		for (const regex of msg.member.settings.regexes) {
			msg.guild.removeCachedRegexp(regex, msg.member);
		}
		await msg.member.settings.reset("regexes", msg.guild);
		return msg.send({
			embed: {
				color: 0x43B581,
				description: `Done! Your highlight regex list has been cleared!`,
			},
		});
	}
};
