const { MessageEmbed } = require("discord.js");
const { Command } = require("klasa");

class HighlightCommand extends Command {
	async redirectDisplay (message, display, time = 120000) {
		const { guild: { settings: { bot } } } = message;
		if (bot.redirect && bot.channel && message.channel.id !== bot.channel) {
			message.channel.send(
				new MessageEmbed()
					.setColor(0x3669FA)
					.setDescription(`This command would be too spammy for this channel!\nPlease go to <#${bot.channel}> to see the results.`)
					.setFooter("This message self-destructs in 10 seconds")
			).then(m => m.delete({ time: 10000 }));
			const channel = message.guild.channels.get(bot.channel);
			if (channel) {
				await channel.send(`${message.author},`);
				return display.pages.length === 1 ?
					channel.send(display.pages[0]) :
					display.run(
						await channel.send("Loading..."),
						{ time, stop: display.pages.length > 1, filter: (reaction, user) => user === message.author, jump: false, firstLast: false }
					);
			}
		}
		return display.pages.length === 1 ?
			message.send(display.pages[0]) :
			display.run(await message.send("Loading..."), { time, stop: display.pages.length > 1, filter: (reaction, user) => user === message.author, jump: false, firstLast: false });
	}
}

module.exports = HighlightCommand;
