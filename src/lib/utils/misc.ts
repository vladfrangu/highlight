import { envParseString } from '@skyra/env-utilities';
import {
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Message,
	MessageComponentInteraction,
	OAuth2Scopes,
	PermissionFlagsBits,
	PermissionsBitField,
	type InviteGenerationOptions,
} from 'discord.js';
import { readFile } from 'node:fs/promises';
import re2 from 're2';

export const rootDir = new URL('../../../', import.meta.url);
export const packageJsonFile = JSON.parse(await readFile(new URL('package.json', rootDir), 'utf8'));

export const supportServerInvite = envParseString('SUPPORT_SERVER_INVITE', 'https://discord.gg/C6D9bge');
export const SupportServerButton = new ButtonBuilder()
	.setStyle(ButtonStyle.Link)
	.setURL(supportServerInvite)
	.setLabel('Support server')
	.setEmoji({
		name: '🆘',
	});

export const inviteOptions: InviteGenerationOptions = {
	scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
	permissions: new PermissionsBitField([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.ReadMessageHistory,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.EmbedLinks,
	]),
};
export const InviteButton = new ButtonBuilder() //
	.setStyle(ButtonStyle.Link)
	.setLabel('Add me to your server!')
	.setEmoji({
		name: '🎉',
	});

export const RegularExpressionCaseSensitiveMatch = '$$HIGHLIGHT_CASE_SENSITIVE$$';

export function tryRegex(input: string): [boolean, re2 | null] {
	const caseSensitiveMatch = input.endsWith(RegularExpressionCaseSensitiveMatch);
	const flags = caseSensitiveMatch ? 'g' : 'gi';
	const finalInput = caseSensitiveMatch ? input.slice(0, -RegularExpressionCaseSensitiveMatch.length) : input;

	try {
		return [true, new re2(finalInput, flags)];
	} catch {
		return [false, null];
	}
}

export function pluralize(count: number, singular: string, plural: string) {
	return count === 1 ? singular : plural;
}

// @ts-ignore - For tests
export const andList = new Intl.ListFormat('en-US', { type: 'conjunction', style: 'long' });

// @ts-ignore - For tests
export const orList = new Intl.ListFormat('en-US', { type: 'disjunction', style: 'long' });

export const enum Emojis {
	ChatInputCommands = '<:chatinputcommands:955124528483283004>',
}

export const enum HelpDetailedDescriptionReplacers {
	UserMention = '{user_mention}',
}

export function resolveUserIdFromMessageOrInteraction(
	messageOrInteraction: Message | ChatInputCommandInteraction | MessageComponentInteraction,
): string {
	return messageOrInteraction instanceof Message ? messageOrInteraction.author.id : messageOrInteraction.user.id;
}
