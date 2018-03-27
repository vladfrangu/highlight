const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Changes this server's accepted prefix",
			usage: "<Prefix:str{,12}>",
			permLevel: 6,
		});
	}

	async run (msg, [prefix = null]) {
		if (prefix) {
			await msg.guild.configs.update("prefix", prefix);
			return msg.send({
				embed: {
					color: 0x43B581,
					description: `You can now use \`${prefix}\` for running my commands in this server.`,
					footer: {
						text: `I'll still answer to your commands if you mention me.`,
					},
				},
			});
		}
		return msg.send({
			embed: {
				color: 0x3669FA,
				description: `The current server prefix is \`${msg.guild.configs.prefix}\``,
				footer: {
					text: `You can also mention me and I will answer to your commands.`,
				},
			},
		});
	}
};
