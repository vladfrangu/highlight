const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed } = require("discord.js");
const { STRIP } = require("../../lib/Constants");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Adds a word or multiple words to your highlight list",
			usage: "<Word:str> [...]",
			usageDelim: " ",
			aliases: ["aword", "aw", "addwords", "awords", "aws", "addw"],
		});

		this.customizeResponse("Word",
			new MessageEmbed()
				.setColor(0xCC0F16)
				.setDescription("You need to provide one or multiple words, separated by spaces")
		);
		this.needsMember = true;
	}

	async run (message, [...providedWords]) {
		const { settings: { words }, settings } = message.member;
		const added = [], already = [], banne = [];
		for (let word of providedWords) {
			word = word.toLowerCase().trim().replace(STRIP, "");
			if (words.includes(word)) {
				already.push(word);
			} else if (!message.guild.filterRegex.test(word)) {
				message.guild.addCachedWord(word, message.member);
				added.push(word);
			} else {
				banne.push(word);
			}
		}

		if (added.length) await settings.update("words", added, { action: "add" });

		if (!(added.length || already.length || banne.length)) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription("No changes were done! How is that even possible?!?!")
			);
		}

		if (!(added.length || already.length) && banne.length) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription("All the words you provided were blocked from being added with me in this server.")
			);
		}

		const display = new RichDisplay(
			new MessageEmbed()
				.setColor(0x3669FA)
		);
		display.setFooterPrefix(`Total Added: ${added.length}${banne.length ? " | Some words were not added cause they were forbiddened" : ""} | Page `);
		const addedChunks = chunk(added, 20);
		for (const chunky of addedChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? ` __${chunky.length}__` : ""} word${chunky.length === 1 ? " was" : "s were"} added`)
					.setDescription(chunky.map(word => `• ${word}`).join("\n"))
			);
		}
		const alreadyChunks = chunk(already, 20);
		for (const chunky of alreadyChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? ` __${chunky.length}__` : ""} word${chunky.length === 1 ? " was" : "s were"} already in your highlight list`)
					.setDescription(chunky.map(word => `• ${word}`).join("\n"))
			);
		}
		return this.redirectDisplay(message, display);
	}
};
