const { Event } = require("klasa");

module.exports = class extends Event {
	constructor (...args) {
		super(...args, {
			enabled: true,
			once: true,
		});
	}

	run () {
		if (!this.client.schedule.get("clearCache")) {
			this.client.schedule.create("cacheCleanup", "*/10 * * * *", {
				catchUp: true,
				id: "clearCache",
			});
		}
		for (const guild of this.client.guilds.values()) {
			for (const member of guild.members.values()) {
				if (member.configs.words.length) for (const word of member.configs.words) guild.addCachedWord(word, member);
			}
		}
	}
};
