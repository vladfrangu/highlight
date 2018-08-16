const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed } = require("discord.js");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: `Shows all your highlighted words in a list`,
			aliases: ["wordlist", "sw", "showwords", "showw", "sword"],
		});
		this.needsMember = true;
	}

	async run (message) {
		const { words } = message.member.settings;
		if (!words.length) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription("You don't have any words to show!")
			);
		}
		const display = new RichDisplay(
			new MessageEmbed()
				.setColor(0x3669FA)
		);
		display.setFooterPrefix(`Total Words: ${words.length} | Page `);
		const chunks = chunk(words, 20);
		for (const chunky of chunks) {
			display.addPage(
				template => template.setTitle(`${chunky.length} word${chunky.length === 1 ? "" : "s"} on this page`)
					.setDescription(chunky.map(word => `• ${word}`).join("\n"))
			);
		}
		return this.redirectDisplay(message, display);
	}
};
