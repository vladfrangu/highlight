const { Structures, Collection } = require("discord.js");
const REPLACERE = /\w(?=(\w)?)/g;

Structures.extend("Guild", Guild => class HighlightGuild extends Guild {
	constructor (...args) {
		super(...args);

		/**
		 * A map containing members mapped to certain trigger words
		 * @type {Collection<string, Set<GuildMember>>}
		 */
		this.words = new Collection();

		/**
		 * A map containing members mapped to certain trigger regex expression
		 * @type {Collection<string, Set<GuildMember>>}
		 */
		this.regexes = new Collection();

		this.regex = null;
	}

	get filterRegex () {
		if (!this.regex) return this.updateRegex();
		return this.regex;
	}

	/**
	 * Adds a member to the guild word list
	 * @param {string} word
	 * @param {GuildMember} member
	 * @returns {this}
	 * @chainable
	 */
	addCachedWord (word, member) {
		const cached = this.words.get(word);
		if (cached) cached.add(member);
		else this.words.set(word, new Set([member]));
		return this;
	}

	/**
	 * Removes a member from the guild word list
	 * @param {string} word
	 * @param {GuildMember} member
	 * @returns {this}
	 * @chainable
	 */
	removeCachedWord (word, member) {
		const cached = this.words.get(word);
		if (cached.size > 1) cached.delete(member);
		else this.words.delete(word);
		return this;
	}

	/**
	 * Adds a member to the guild regex list
	 * @param {string} regex
	 * @param {GuildMember} member
	 * @returns {this}
	 * @chainable
	 */
	addCachedRegexp (regex, member) {
		const cached = this.regexes.get(regex);
		if (cached) cached.add(member);
		else this.regexes.set(regex, new Set([member]));
		return this;
	}

	/**
	 * Removes a member from the guild regex list
	 * @param {string} regex
	 * @param {GuildMember} member
	 * @returns {this}
	 * @chainable
	 */
	removeCachedRegexp (regex, member) {
		const cached = this.regexes.get(regex);
		if (cached.size > 1) cached.delete(member);
		else this.regexes.delete(regex);
		return this;
	}

	/**
	 * Updates the banned word regex
	 * @private
	 * @returns {RegExp}
	 */
	updateRegex () {
		// eslint-disable-next-line no-return-assign
		if (!this.settings.bannedWords.length) return this.regex = { test: () => false };
		const filter = this.settings.bannedWords.reduce((acum, item, index) => acum + (index ? "|" : "") +
			item.replace(REPLACERE, (letter, nextWord) => `${letter}+${nextWord ? "\\W*" : ""}`), ""
		);
		// eslint-disable-next-line no-return-assign
		return this.regex = new RegExp(`\\b(?:${filter})\\b`, "i");
	}
});
