import re2 from 're2';

export function tryRegex(input: string): [boolean, re2 | null] {
	try {
		return [true, new re2(input, 'ig')];
	} catch {
		return [false, null];
	}
}

export function pluralize(count: number, singular: string, plural: string) {
	return count === 1 ? singular : plural;
}

export const andList = new Intl.ListFormat('en-US', { type: 'conjunction', style: 'long' });

export const orList = new Intl.ListFormat('en-US', { type: 'disjunction', style: 'long' });

export const enum Emojis {
	ChatInputCommands = '<:chatinputcommands:955124528483283004>',
}

export const enum HelpDetailedDescriptionReplacers {
	UserMention = '{user_mention}',
}
