const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed } = require("discord.js");
const { STRIP } = require("../../lib/Constants");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Removes a word or multiple words from your highlight list",
			usage: "<Word:str> [...]",
			usageDelim: " ",
			aliases: ["rword", "rw", "removewords", "rwords", "rws", "removew"],
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
		if (!words.length) {
			return message.send({
				embed: {
					color: 0xCC0F16,
					description: `You have no words to remove!`,
				},
			});
		}
		const removed = [], inexistent = [];
		for (let word of providedWords) {
			word = word.toLowerCase().trim().replace(STRIP, "");
			if (words.includes(word)) {
				removed.push(word);
				message.guild.removeCachedWord(word, message.member);
			} else if (!message.guild.filterRegex.test(word)) {
				inexistent.push(word);
			}
		}

		if (removed.length) await settings.update("words", removed, { action: "remove" });

		if (!(removed.length || inexistent.length)) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription("No changes were done! How is that even possible?!?!")
			);
		}
		const display = new RichDisplay(
			new MessageEmbed()
				.setColor(0x3669FA)
		);
		display.setFooterPrefix(`Total Removed: ${removed.length} | Page `);
		const removedChunks = chunk(removed, 20);
		for (const chunky of removedChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? ` __${chunky.length}__` : ""} word${chunky.length === 1 ? " was" : "s were"} removed`)
					.setDescription(chunky.map(word => `• ${word}`).join("\n"))
			);
		}
		const inexistentChunks = chunk(inexistent, 20);
		for (const chunky of inexistentChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? `__${chunky.length}__` : ""} word${chunky.length === 1 ? " was" : "s were"} not existent in your highlight list`)
					.setDescription(chunky.map(word => `• ${word}`).join("\n"))
			);
		}
		return this.redirectDisplay(message, display);
	}
};
