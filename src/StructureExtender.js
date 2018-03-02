const { Structures } = require("discord.js");

Structures.extend("GuildMember", GuildMember => class HighlightMember extends GuildMember {
	constructor (...args) {
		super(...args);
		this.configs = this.client.gateways.members.cache.get(`${this.guild.id}-${this.id}`) || this.client.gateways.members.insertEntry(`${this.guild.id}-${this.id}`);
	}
});

Structures.extend("Guild", Guild => class HighlightGuild extends Guild {
	constructor (...args) {
		super(...args);

		/**
		 * A map containing members mapped to certain trigger words
		 * @type {Map<string, Set<GuildMember>>}
		 */
		this.words = new Map();
	}
})
