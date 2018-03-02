const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			cooldown: 5,
			description: "Clears your highlighted word list",
		});
	}

	async run (msg) {
		if (!msg.member.configs.words.length) {
			return msg.send(null, {
				embed: {
					color: 0xCC0F16,
					description: `You don't have any words to clear!`,
				},
			});
		}
		msg.member.configs.words.forEach(word => this.client.removeCachedWord(msg.guild, word, msg.member));
		await msg.member.configs.reset("words", msg.guild);
		return msg.send(null, {
			embed: {
				color: 0x43B581,
				description: `Done! Your highlight word list has been cleared!`,
			},
		});
	}
};
