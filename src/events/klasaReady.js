const { Event } = require("klasa");

module.exports = class extends Event {
	constructor (...args) {
		super(...args, {
			enabled: true,
			once: false,
		});
	}

	run () {
		if (this.client.schedule.tasks.find(schedule => schedule.id === "clearCache")) {
			this.client.schedule.create("cacheCleanup", "*/10 * * * *", {
				catchUp: true,
				id: "clearCache",
			});
		}
		for (const guild of this.client.guilds.values()) {
			guild.members.filter(m => m.configs && m.configs.words.length).forEach(member => {
				member.configs.words.forEach(word => {
					this.client.addCachedWord({ member, guild }, word);
				});
			});
		}
	}
};
