import re2 from 're2';

import { tryRegex } from '../utils/Util';
import type { HighlightResult, GuildWorkerType } from '../types/Misc';

const invalidRegexMock = { test: () => false } as unknown as re2;

export class WorkerCache {
	// Map of Guild ID => Word|Regex => UserID
	private _guildMap = new Map<string, Map<string, Set<string>>>();
	private _validRegex = new Map<string, boolean>();
	private _stringToRegularExpression = new Map<string, re2>();

	updateGuild(id: string, newEntries: Map<string, Set<string>>) {
		this._guildMap.set(id, newEntries);
	}

	/**
	 * @param regex The regular expression to cache
	 * @param valid If the regular expression was valid
	 */
	setValidRegex(regex: string, valid: boolean) {
		this._validRegex.set(regex, valid);
	}

	/**
	 * Checks if a regular expression string is valid
	 * @param regex The regular expression to validate
	 */
	isRegexValid(regex: string) {
		const cached = this._validRegex.get(regex);
		if (typeof cached === 'boolean') return cached;

		const [valid, validatedRegex] = tryRegex(regex);
		this.setValidRegex(regex, valid);
		if (validatedRegex) this._stringToRegularExpression.set(regex, validatedRegex);
		return valid;
	}

	parse(type: GuildWorkerType, guildID: string, authorID: string, content: string) {
		const returnData: HighlightResult = { type, results: [] };

		const guildData = this._guildMap.get(guildID);
		// If we have no guild data (either no words or regexes configured, return early)
		if (!guildData) return returnData;

		// We now have a map of Word|Regex => User IDs

		switch (type) {
			case 'regularExpressions': {
				for (const [regexString, members] of guildData.entries()) {
					const actualRegularExpression = this._getOrCacheRegularExpression(regexString);
					if (!actualRegularExpression.test(content)) continue;
					const parsedContent = content.trim().replace(actualRegularExpression, (matchedValue) => {
						if (matchedValue.trim().length > 0) return `**${matchedValue}**`;
						return matchedValue;
					});
					for (const memberID of members) {
						if (memberID === authorID) continue;
						returnData.results.push({ memberID, parsedContent, trigger: regexString });
					}
				}
				break;
			}
			case 'words': {
				const splitWords = content.toLowerCase().split(/\s*\b\s*/);
				for (const [word, possibleMembers] of guildData.entries()) {
					if (!splitWords.includes(word.toLowerCase())) continue;
					const parsedContent = content.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (matchedValue) => `**${matchedValue}**`);
					for (const memberID of possibleMembers) {
						if (memberID === authorID) continue;
						returnData.results.push({ memberID, parsedContent, trigger: word });
					}
				}
				break;
			}
			default:
		}

		return returnData;
	}

	private _getOrCacheRegularExpression(input: string) {
		const cached = this._stringToRegularExpression.get(input);
		if (cached) return cached;

		try {
			const newExpression = new re2(input, 'gi');
			this._stringToRegularExpression.set(input, newExpression);
			return newExpression;
		} catch {
			return invalidRegexMock;
		}
	}
}
