import re2 from 're2';
import type { HighlightResult, RemoveTriggerForUserCommand } from '../types/WorkerTypes';

import { tryRegex } from '../Util';
import { WorkerType } from './HighlightManager';

const invalidRegexMock = ({ test: () => false } as unknown) as re2;

type UserID = string;
type GuildID = string;

export class WorkerCache {
	// Map of Guild ID => Word | Regular Expression => UserID
	private guildMap = new Map<GuildID, Map<string, Set<UserID>>>();

	// Cache of validated regular expressions
	private validRegularExpressions = new Map<string, boolean>();

	// Cache of created regular expressions
	private stringToRegularExpression = new Map<string, re2>();

	public updateGuild(id: string, newEntries: Map<string, Set<UserID>>) {
		this.guildMap.set(id, newEntries);
	}

	public removeTriggerForUser({ guildID, memberID, trigger }: RemoveTriggerForUserCommand['data']) {
		// Get all guild triggers
		const guildEntry = this.guildMap.get(guildID);

		// If this guild has no entries, return
		if (!guildEntry) return;

		// Get all trigger-able users for this trigger
		const triggerables = guildEntry.get(trigger);

		// If this isn't a trigger, return
		if (!triggerables) return;

		// Remove the member
		triggerables.delete(memberID);

		// If nobody is left to get highlighted by this, delete it from the map
		if (triggerables.size === 0) guildEntry.delete(trigger);
	}

	/**
	 * Checks if a regular expression string is valid
	 * @param regex The regular expression to validate
	 */
	public isRegularExpressionValid(regex: string) {
		const cached = this.validRegularExpressions.get(regex);
		if (typeof cached === 'boolean') return cached;

		const [valid, validatedRegex] = tryRegex(regex);
		this.setValidRegex(regex, valid);
		if (validatedRegex) this.stringToRegularExpression.set(regex, validatedRegex);
		return valid;
	}

	public parse(type: WorkerType, guildID: string, authorID: string, content: string) {
		const returnData: HighlightResult = { type, results: [] };

		const guildData = this.guildMap.get(guildID);
		// If we have no guild data (either no words or regular expressions configured, return early)
		if (!guildData) return returnData;

		// We now have a map of Word | Regular Expression => User IDs

		switch (type) {
			case WorkerType.RegularExpression: {
				for (const [regexString, members] of guildData.entries()) {
					const actualRegularExpression = this.getOrCacheRegularExpression(regexString);
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
			case WorkerType.Word: {
				const splitWords = content.toLowerCase().split(/\s*\b\s*/);
				for (const [word, possibleMembers] of guildData.entries()) {
					if (!splitWords.includes(word.toLowerCase())) continue;
					const parsedContent = content.replace(
						new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
						(matchedValue) => `**${matchedValue}**`,
					);
					for (const memberID of possibleMembers) {
						if (memberID === authorID) continue;
						returnData.results.push({ memberID, parsedContent, trigger: word });
					}
				}
				break;
			}
		}

		return returnData;
	}

	/**
	 * @param regex The regular expression to cache
	 * @param valid If the regular expression was valid
	 */
	private setValidRegex(regex: string, valid: boolean) {
		this.validRegularExpressions.set(regex, valid);
	}

	private getOrCacheRegularExpression(input: string) {
		const cached = this.stringToRegularExpression.get(input);
		if (cached) return cached;

		try {
			const newExpression = new re2(input, 'gi');
			this.stringToRegularExpression.set(input, newExpression);
			return newExpression;
		} catch {
			return invalidRegexMock;
		}
	}
}
