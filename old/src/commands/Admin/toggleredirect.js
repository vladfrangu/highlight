const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Toggles this server's redirect to the bot channel",
			permissionLevel: 6,
			aliases: ["tr", "toggler", "togglered"],
		});
	}

	async run (message) {
		const newValue = !message.guild.settings.bot.redirect;
		await message.guild.settings.update("bot.redirect", newValue);
		return message.send({
			embed: {
				color: 0x43B581,
				description: `I've toggled the redirect to **${newValue ? "on" : "off"}**`,
			},
		});
	}
};
