const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: `Shows all your highlighted words in a list`,
			aliases: ["list"],
		});
		this.needsMember = true;
	}

	async run (msg) {
		if (!msg.member.configs.words.length) {
			return msg.send({
				embed: {
					color: 0xCC0F16,
					description: `You don't have any words to show!`,
				},
			});
		}
		const wordList = msg.member.configs.words.map(word => `• ${word}`).join("\n");
		return msg.send({
			embed: {
				color: 0x3669FA,
				title: `You have __${msg.member.configs.words.length}__ word${msg.member.configs.words.length === 1 ? "" : "s"} set`,
				description: wordList,
			},
		});
	}
}
