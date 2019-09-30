import { Structures } from 'discord.js';

export type GuildWorkerType = 'words' | 'regularExpressions';

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

	removeWord(word: string, userID: string) {
		return this._sharedRemove('words', word, userID);
	}

	addRegularExpression(regex: string, userID: string) {
		return this._sharedAdd('regularExpressions', regex, userID);
	}

	removeRegularExpression(regex: string, userID: string) {
		return this._sharedRemove('regularExpressions', regex, userID);
	}

	private _sharedAdd(type: GuildWorkerType, value: string, userID: string) {
		const cached = this[type].get(value);
		if (cached) cached.add(userID);
		else this[type].set(value, new Set([userID]));
		this.client.workerManager.update(type, this.id, this[type]);
	}

	private _sharedRemove(type: 'words' | 'regularExpressions', value: string, userID: string) {
		const cached = this[type].get(value);
		if (cached) {
			cached.delete(userID);
			if (!cached.size) this[type].delete(value);
		}
		this.client.workerManager.update(type, this.id, this[type]);
	}
}

Structures.extend('Guild', () => HighlightGuild);

declare module 'discord.js' {
	interface Guild {
		words: Map<string, Set<string>>;
		regularExpressions: Map<string, Set<string>>;

		addWord(word: string, userID: string): void;
		removeWord(word: string, userID: string): void;
		addRegularExpression(word: string, userID: string): void;
		removeRegularExpression(word: string, userID: string): void;
	}
}
