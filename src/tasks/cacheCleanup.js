const { Task } = require("klasa");

module.exports = class extends Task {
	constructor (...args) {
		super(...args, { enabled: true });
	}

	async run () {
		for (const guild of this.client.guilds.values()) {
			// Maybe don't do this if your social module requires this
			guild.presences.clear();

			// Obviously don't do this if you are a music bot
			for (const channel of guild.channels.values()) {
				if (channel.type !== "voice") continue;
				guild.channels.delete(channel.id);
				this.client.channels.delete(channel.id);
			}

			// Wtf kinda bot needs emojis?!? Go wild my friends
			guild.emojis.clear();
		}
		this.client.emit("debug", "Cleared all Emojis, VoiceChannels and Presences...");
	}
};
