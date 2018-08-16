const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed, Util: { escapeMarkdown } } = require("discord.js");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Removes a regex or multiple regexes from your highlight list",
			usage: "<Regex:str> [...]",
			usageDelim: " ",
			aliases: ["rregex", "rr", "removeregexes", "rregexes", "rrs", "remover"],
			quotedStringSupport: true,
		});

		this.customizeResponse("Regex", message => new MessageEmbed()
			.setColor(0xCC0F16)
			.setDescription("You need to provide one or multiple regexes, separated by spaces")
		);
		this.needsMember = true;
	}

	async run (message, [...providedExpressions]) {
		const { settings: { regexes }, settings } = message.member;
		if (!regexes.length) {
			return message.send({
				embed: {
					color: 0xCC0F16,
					description: `You have no regexes to remove!`,
				},
			});
		}
		const removed = [], inexistent = [];
		for (const regex of providedExpressions) {
			if (regexes.includes(regex)) {
				removed.push(regex);
				message.guild.removeCachedWord(regex, message.member);
			} else {
				inexistent.push(regex);
			}
		}

		if (removed.length) await settings.update("regexes", removed, { action: "remove" });

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
				template => template.setTitle(`The following${chunky.length !== 1 ? ` __${chunky.length}__` : ""} regex${chunky.length === 1 ? " was" : "es were"} removed`)
					.setDescription(chunky.map(regex => `• ${escapeMarkdown(regex)}`).join("\n"))
			);
		}
		const inexistentChunks = chunk(inexistent, 20);
		for (const chunky of inexistentChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? `__${chunky.length}__` : ""} regex${chunky.length === 1 ? " was" : "es were"} not existent in your highlight list`)
					.setDescription(chunky.map(regex => `• ${escapeMarkdown(regex)}`).join("\n"))
			);
		}
		return this.redirectDisplay(message, display);
	}
};
