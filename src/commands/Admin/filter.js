const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed } = require("discord.js");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Bans words from being added.",
			usage: "<list> [words:string] [...]",
			permissionLevel: 6,
			subcommands: true,
			usageDelim: ",",
			aliases: ["filters"],
			enabled: false,
		});

		this.acceptedValues = [
			"y",
			"yes",
			"ye",
			"1",
			"+",
		];
	}

	async list (message) {
		const { settings: { bannedWords } } = message.guild;
		if (!bannedWords.length) {
			return message.send({
				embed: {
					color: 0xCC0F16,
					description: `No words are banned from being added with me!`,
				},
			});
		}
		const m = await message.prompt("Are you sure you want me to list all banned words? A simple `yes` or `no` will suffice.", 60000).catch(() => null);
		if (m && this.acceptedValues.includes(m.content.toLowerCase())) {
			const display = new RichDisplay(
				new MessageEmbed()
					.setColor(0x3669FA)
			);
			display.setFooterPrefix(`Total Banned Words: ${bannedWords.length} | Page `);
			const chunks = chunk(bannedWords, 20);
			for (const chunky of chunks) {
				display.addPage(
					template => template.setTitle(`${chunky.length} words on this page`)
						.setDescription(chunky.map(word => `• ${word}`).join("\n"))
				);
			}
			return this.redirectDisplay(message, display);
		}
		return message.send("I won't show you the words!");
	}
};
