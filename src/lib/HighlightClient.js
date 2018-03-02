const { Client } = require("klasa");

module.exports = class HighlightClient extends Client {
	async login (token) {
		// Same Jacz
		await Promise.all(this.pieceStores.map(store => store.loadAll())).catch(err => {
			console.error(err);
			process.exit(-1);
		});
		await this.providers.init();
		await this.gateways.add("members", {
			words: {
				type: "string",
				default: [],
				min: null,
				max: null,
				array: true,
				configurable: true,
				sql: "TEXT",
			},
			blacklistedUsers: {
				type: "user",
				default: [],
				min: null,
				max: null,
				array: true,
				configurable: true,
				sql: "TEXT",
			},
			blacklistedChannels: {
				type: "textchannel",
				default: [],
				min: null,
				max: null,
				array: true,
				configurable: true,
				sql: "TEXT",
			},
		}, { provider: "json" }, false);
		return super.login(token);
	}

	async addCachedWord (guild, word, member) {
		let cachedItem = guild.words.get(word);
		if (!cachedItem) {
			guild.words.set(word, new Set());
			cachedItem = guild.words.get(word);
		}
		cachedItem.add(member.id);
	}

	async removeCachedWord (guild, word, member) {
		let cachedItem = guild.words.get(word);
		if (!cachedItem) return;
		if (cachedItem.has(member.id)) {
			cachedItem.delete(member.id);
		}
		if (!cachedItem.size) guild.words.delete(word);
	}
};
