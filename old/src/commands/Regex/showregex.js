const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed, Util: { escapeMarkdown } } = require("discord.js");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: `Shows all your highlighted regexes in a list`,
			aliases: ["regexlist", "sr", "showregexes", "showr", "sregex"],
		});
		this.needsMember = true;
	}

	async run (message) {
		const { regexes } = message.member.settings;
		if (!regexes.length) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription("You don't have any regexes to show!")
			);
		}
		const display = new RichDisplay(
			new MessageEmbed()
				.setColor(0x3669FA)
		);
		display.setFooterPrefix(`Total Regexes: ${regexes.length} | Page `);
		const chunks = chunk(regexes, 20);
		for (const chunky of chunks) {
			display.addPage(
				template => template.setTitle(`${chunky.length} regex${chunky.length === 1 ? "" : "es"} on this page`)
					.setDescription(chunky.map(regex => `• ${escapeMarkdown(regex)}`).join("\n"))
			);
		}
		return this.redirectDisplay(message, display);
	}
};
