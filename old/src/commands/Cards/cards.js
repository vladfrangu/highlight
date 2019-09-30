const { Command } = require("klasa");
const Game = require("../../lib/CaH/Game");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			aliases: ["cah", "cards-against-humanity", "crude-cards"],
			description: "An awesome game",
			usage: "<add|remove> <user:user>, <reason:string>",
			usageDelim: ' ',
			promptLimit: Infinity,
			subcommands: true,
		});
	}

	async add(message, [user, reason]) {
		message.channel.send(`${user}, Hi! ${reason}`);
	}

	async run (message, [points = 5, handSize = 10, blankCards = 0, playerLimit = 4]) {
		const game = message.channel.cahGame = new Game({ points, handSize, blankCards, playerLimit });
		await game.addUserToGame(message.author).catch(() => { throw "You couldn't automatically join the game cause your DMs are off. Please enable your DMs and manually join. The game has been created" });
		return message.send("The game has been created.");
	}

	async start (msg) {
		// TODO: Starts the game.
	}

	async join (msg) {
		if (!msg.channel.cahGame) throw "There isn't a Card Against Humanity running in this channel!";
		await msg.channel.cahGame.addUserToGame(msg.author);
		return msg.send("You're in! You'll get your cards when the next round starts!");
	}

	async leave (msg) {
		if (!msg.channel.cahGame) throw "There isn't a Card Against Humanity running in this channel!";
		await msg.channel.cahGame.removeUserFromGame(msg.author);
		return msg.send("You've successfully left the game");
	}
};
