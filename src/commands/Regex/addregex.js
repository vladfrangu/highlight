const { RichDisplay, util: { chunk } } = require("klasa");
const { MessageEmbed, Util: { escapeMarkdown } } = require("discord.js");
const Command = require("../../lib/HighlightCommand");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: language => language.get("COMMAND_REGEX_ADD_DESCRIPTION"),
			extendedHelp: language => language.get("COMMAND_REGEX_ADD_EXTENDED"),
			usage: "<Regex:str> [...]",
			usageDelim: " ",
			aliases: ["aregex", "ar", "addregexes", "aregexes", "ars", "addr"],
			quotedStringSupport: true,
		});

		this.customizeResponse("Regex", new MessageEmbed()
			.setColor(0xCC0F16)
			.setDescription("You need to provide one or multiple regexes, separated by spaces")
		);
		this.needsMember = true;
	}

	async run (message, [...providedExpressions]) {
		const { settings: { regexes }, settings } = message.member;
		if (regexes.length >= 6) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription("You have too many regular expressions! Remove some or merge them together!")
			);
		}
		const added = [], already = [];
		let tooMany = false;
		for (const reg of providedExpressions) {
			if (regexes.includes(reg)) {
				already.push(reg);
			} else if ((regexes.length + added.length) >= 6) {
				tooMany = true;
				break;
			} else {
				message.guild.addCachedRegexp(reg, message.member);
				added.push(reg);
			}
		}

		if (added.length) await settings.update("regexes", added, { action: "add" });

		if (!(added.length || already.length)) {
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
		display.setFooterPrefix(`Total Added: ${added.length}${tooMany ? " | You wanted to add too many regular expressions. You can't do that!" : ""} | Page `);
		const addedChunks = chunk(added, 20);
		for (const chunky of addedChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? ` __${chunky.length}__` : ""} regex${chunky.length === 1 ? " was" : "es were"} added`)
					.setDescription(chunky.map(regex => `• ${escapeMarkdown(regex)}`).join("\n"))
			);
		}
		const alreadyChunks = chunk(already, 20);
		for (const chunky of alreadyChunks) {
			display.addPage(
				template => template.setTitle(`The following${chunky.length !== 1 ? ` __${chunky.length}__` : ""} regex${chunky.length === 1 ? " was" : "es were"} already in your highlight list`)
					.setDescription(chunky.map(regex => `• ${escapeMarkdown(regex)}`).join("\n"))
			);
		}
		return this.redirectDisplay(message, display);
	}
};
