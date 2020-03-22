import { Structures } from 'discord.js';
import { GuildWorkerType } from './types/Misc';

export class HighlightGuild extends Structures.get('Guild') {
	/**
	 * Map of word => user IDs
	 */
	words = new Map<string, Set<string>>();
	/**
	 * Map of regular expressions => IDs
	 */
	regularExpressions = new Map<string, Set<string>>();

	addWord(word: string, userID: string) {
		return this._sharedAdd('words', word, userID);
	}

	addWords(words: string[], userID: string) {
		for (const word of words) {
			const cached = this.words.get(word);
			if (cached) cached.add(userID);
			else this.words.set(word, new Set([userID]));
		}
		this.client.workers.update('words', this.id, this.words);
	}

	removeWord(word: string, userID: string) {
		return this._sharedRemove('words', word, userID);
	}

	addRegularExpression(regex: string, userID: string) {
		return this._sharedAdd('regularExpressions', regex, userID);
	}

	addRegularExpressions(regexes: string[], userID: string) {
		for (const regex of regexes) {
			const cached = this.regularExpressions.get(regex);
			if (cached) cached.add(userID);
			else this.regularExpressions.set(regex, new Set([userID]));
		}
		this.client.workers.update('regularExpressions', this.id, this.regularExpressions);
	}

	removeRegularExpression(regex: string, userID: string) {
		return this._sharedRemove('regularExpressions', regex, userID);
	}

	private _sharedAdd(type: GuildWorkerType, value: string, userID: string) {
		const cached = this[type].get(value);
		if (cached) cached.add(userID);
		else this[type].set(value, new Set([userID]));
		this.client.workers.update(type, this.id, this[type]);
	}

	private _sharedRemove(type: GuildWorkerType, value: string, userID: string) {
		const cached = this[type].get(value);
		if (cached) {
			cached.delete(userID);
			if (!cached.size) this[type].delete(value);
		}
		this.client.workers.update(type, this.id, this[type]);
	}
}

Structures.extend('Guild', () => HighlightGuild);

declare module 'discord.js' {
	interface Guild {
		words: Map<string, Set<string>>;
		regularExpressions: Map<string, Set<string>>;

		addWord(word: string, userID: string): void;
		addWords(words: string[], userID: string): void;
		removeWord(word: string, userID: string): void;
		addRegularExpression(word: string, userID: string): void;
		addRegularExpressions(regularExpressions: string[], userID: string): void;
		removeRegularExpression(word: string, userID: string): void;
	}
}
