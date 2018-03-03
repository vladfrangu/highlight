const { Command, util } = require("klasa");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			aliases: ["commands"],
			guarded: true,
			description: msg => msg.language.get("COMMAND_HELP_DESCRIPTION"),
			usage: "[Command:cmd]",
		});
	}

	async run (msg, [cmd]) {
		if (cmd) {
			return msg.send({
				embed: {
					color: 0x3669FA,
					title: `Help for the __${cmd.name}__ command`,
					description: `Full usage: ${msg.language.get("COMMAND_HELP_USAGE", cmd.usage.fullUsage(msg)).slice(1)}\n\nDescription: ${util.isFunction(cmd.description) ? cmd.description(msg) : cmd.description}`,
				},
			});
		}
		return msg.send({
			embed: {
				color: 0x3669FA,
				fields: [
					{
						name: `add`,
						value: `Adds a word or a phrase to your highlight list`,
					},
					{
						name: `block`,
						value: `Block a member or a channel from highlighting you`,
					},
					{
						name: `blocked`,
						value: `Shows your list of blocked members / channels`,
					},
					{
						name: `clear`,
						value: `Clears your highlighted word list`,
					},
					{
						name: `info`,
						value: `Tells you some information about me!`,
					},
					{
						name: `invite`,
						value: `Gives you the invite link for the bot`,
					},
					{
						name: `remove`,
						value: `Removes a word or a phrase from your highlight list`,
					},
					{
						name: `show`,
						value: `Shows all your highlighted words in a list`,
					},
					{
						name: `unblock`,
						value: `Unblock a channel or a member from the highlight block`,
					},
				],
				footer: {
					text: `Use "@${this.client.user.tag} help command" to find out more about a command!`,
				},
			},
		});
	}
};
