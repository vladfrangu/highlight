const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			guarded: true,
			description: msg => msg.language.get("COMMAND_INVITE_DESCRIPTION"),
			botPerms: ["EMBED_LINKS"],
		});
	}

	async run (msg) {
		return msg.send({
			embed: {
				color: 0x3669FA,
				title: `Thanks for choosing ${this.client.user}!`,
				description: `To invite me to your server, please use [this](https://discordapp.com/oauth2/authorize?client_id=${this.client.user.id}&scope=bot&permissions=84992) link!`,
				thumbnail: {
					url: this.client.user.displayAvatarURL(),
				},
			},
		});
	}
};
