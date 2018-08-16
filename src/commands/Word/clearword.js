const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			cooldown: 5,
			description: "Clears your highlighted word list",
			aliases: ["cword", "cwords", "cw", "cws", "clearw"],
		});
		this.needsMember = true;
	}

	async run (msg) {
		if (!msg.member.settings.words.length) {
			return msg.send({
				embed: {
					color: 0xCC0F16,
					description: `You don't have any words to clear!`,
				},
			});
		}
		for (const word of msg.member.settings.words) {
			msg.guild.removeCachedWord(word, msg.member);
		}
		await msg.member.settings.reset("words", msg.guild);
		return msg.send({
			embed: {
				color: 0x43B581,
				description: `Done! Your highlight word list has been cleared!`,
			},
		});
	}
};
