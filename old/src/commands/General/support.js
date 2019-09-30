const { Command } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			guarded: true,
			description: "Gives an invite to the support server.",
		});
	}

	async run (message) {
		return message.send({
			embed: {
				color: 0x3669FA,
				title: "Need help with Highlight?",
				description: "We're here to help! You can join the support server by clicking [here](https://discord.gg/C6D9bge)!",
				footer: {
					text: `We are not responsible for any anti-advertising rules that might be broken due to the usage of this command.`,
				},
			},
		});
	}
};
