const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Changes this server's bot redirect channel",
			usage: "(channel:channel)",
			permissionLevel: 6,
			aliases: ["src", "setredich", "setredch"],
		});

		this.createCustomResolver("channel", (arg, possible, message) => {
			if (!arg || arg === "none" || arg === "null") return null;
			if (arg.toLowerCase() === "this") return message.channel;
			return this.client.arguments.get("channel").run(arg, possible, message);
		});
	}

	async run (message, [channel = undefined]) {
		if (channel !== undefined) {
			await message.guild.settings.update("bot.channel", channel);
			return message.send({
				embed: {
					color: 0x43B581,
					description: `I've set the channel to ${channel === null ? "**none**" : channel}`,
				},
			});
		}
		return message.send({
			embed: {
				color: 0x3669FA,
				description: `The current bot redirect channel is set to ${message.guild.channels.get(message.guild.settings.bot.channel)}`,
			},
		});
	}
};
