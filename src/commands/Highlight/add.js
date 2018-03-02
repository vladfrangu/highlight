const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Adds a word or a phrase to your highlight list",
			usage: "<Word:str>",
		});
	}

	async run (msg, [word]) {
		word = word.toLowerCase();
		if (msg.member.configs.words.includes(word)) {
			return msg.send(null, {
				embed: {
					color: 0xCC0F16,
					description: `You already have that word in your word list!`,
				},
			});
		}
		// TODO: Implement the guild-level cache
		msg.member.configs.update("words", word);
		return msg.send(null, {
			embed: {
				color: 0x43B581,
				description: `Done! \`${word}\` has been added to your highlight list.`,
			},
		});
	}
};
