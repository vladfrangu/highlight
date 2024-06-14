import type re2 from 're2';
import {
	WorkerResponseTypes,
	WorkerType,
	type HighlightResult,
	type RemoveTriggerForUserCommand,
} from '#types/WorkerTypes';
import { tryRegex } from '#utils/misc';
import { sendToMainProcess } from '#workers/common';

export type UserId = string;
export type GuildId = string;
export type WordOrRegularExpression = string;

export class WorkerCache {
	// Map of Guild ID => Word | Regular Expression => UserID
	private guildMap = new Map<GuildId, Map<WordOrRegularExpression, Set<UserId>>>();

	// Cache of validated regular expressions
	private validRegularExpressions = new Map<string, boolean>();

	// Cache of created regular expressions
	private stringToRegularExpression = new Map<string, re2>();

	public updateGuild(id: GuildId, newEntries: Map<WordOrRegularExpression, Set<UserId>>) {
		this.guildMap.set(id, newEntries);
	}

	public removeTriggerForUser({ guildId, memberId, trigger }: RemoveTriggerForUserCommand['data']) {
		// Get all guild triggers
		const guildEntry = this.guildMap.get(guildId);

		// If this guild has no entries, return
		if (!guildEntry) {
			return;
		}

		// Get all trigger-able users for this trigger
		const triggerables = guildEntry.get(trigger);

		// If this isn't a trigger, return
		if (!triggerables) {
			return;
		}

		// Remove the member
		triggerables.delete(memberId);

		// If nobody is left to get highlighted by this, delete it from the map
		if (triggerables.size === 0) {
			guildEntry.delete(trigger);

			// If there are no more triggers, delete the guild
			if (guildEntry.size === 0) {
				this.guildMap.delete(guildId);
			}
		}
	}

	/**
	 * Checks if a regular expression string is valid
	 */
	public isRegularExpressionValid(regex: string) {
		const cached = this.validRegularExpressions.get(regex);
		if (typeof cached === 'boolean') {
			return cached;
		}

		const [valid, validatedRegex] = tryRegex(regex);
		this.setValidRegex(regex, valid);
		if (validatedRegex) this.stringToRegularExpression.set(regex, validatedRegex);
		return valid;
	}

	public parse(type: WorkerType, guildId: string, authorId: string, content: string) {
		const returnData: HighlightResult = { type, results: [], memberIds: [] };

		const guildData = this.guildMap.get(guildId);

		// If we have no guild data (either no words or regular expressions configured, return early)
		if (!guildData?.size) {
			return returnData;
		}

		const alreadyHighlighted = new Set<UserId>();

		// We now have a map of Word | Regular Expression => User IDs

		switch (type) {
			case WorkerType.RegularExpression: {
				for (const [regexString, members] of guildData.entries()) {
					const actualRegularExpression = this.getOrCacheRegularExpression(regexString);

					if (!actualRegularExpression) {
						for (const member of members) {
							sendToMainProcess({
								command: WorkerResponseTypes.DeleteInvalidRegularExpression,
								data: {
									guildId,
									memberId: member,
									value: regexString,
								},
							});
							this.removeTriggerForUser({ guildId, memberId: member, trigger: regexString });
						}

						continue;
					}

					if (!actualRegularExpression.test(content)) {
						continue;
					}

					const parsedContent = content.trim().replace(actualRegularExpression, (matchedValue) => {
						if (matchedValue.trim().length > 0) return `**${matchedValue}**`;
						return `__${matchedValue}__`;
					});

					for (const memberId of members) {
						if (memberId === authorId || alreadyHighlighted.has(memberId)) {
							continue;
						}

						alreadyHighlighted.add(memberId);
						returnData.results.push({ memberId, parsedContent, trigger: regexString });
					}
				}

				break;
			}

			case WorkerType.Word: {
				const originalSplit = content.toLowerCase().split(/\s+/);

				for (const [word, possibleMembers] of guildData.entries()) {
					const wordIndex = originalSplit.indexOf(word.toLowerCase());

					if (wordIndex === -1) {
						continue;
					}

					const cloned = originalSplit.map((item) => {
						if (item.toLowerCase() === word.toLowerCase()) return `**${item}**`;
						return item;
					});

					const parsedContent = cloned.join('');

					for (const memberId of possibleMembers) {
						if (memberId === authorId || alreadyHighlighted.has(memberId)) {
							continue;
						}

						alreadyHighlighted.add(memberId);

						returnData.results.push({ memberId, parsedContent, trigger: word });
					}
				}

				break;
			}
		}

		returnData.memberIds = [...alreadyHighlighted];

		return returnData;
	}

	protected setValidRegex(regex: string, valid: boolean) {
		this.validRegularExpressions.set(regex, valid);
	}

	private getOrCacheRegularExpression(input: string) {
		const cached = this.stringToRegularExpression.get(input);
		if (cached) {
			return cached;
		}

		const [valid, pattern] = tryRegex(input);

		if (!valid) {
			return null;
		}

		this.stringToRegularExpression.set(input, pattern!);
		return pattern;
	}
}
