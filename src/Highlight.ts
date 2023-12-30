import '#setup';

import process from 'node:process';
import { container, LogLevel } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import type { GuildMember, User } from 'discord.js';
import { ActivityType, GatewayIntentBits, IntentsBitField, Options } from 'discord.js';
import { HighlightClient } from '#structures/HighlightClient';

function clientUserFilter(member: GuildMember | User) {
	return member.id !== member.client.user!.id;
}

const client = new HighlightClient({
	presence: {
		activities: [
			{
				name: 'messages fly by!',
				type: ActivityType.Watching,
			},
		],
	},
	defaultPrefix: [
		// Common prefixes from DB dump. I cannot wait to drop these in v4
		',',
		'!',
		'?.',
		'?',
		'.',
		'^',
		'=',
		'>',
		'h!',
		'h.',
	],
	intents: new IntentsBitField([
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		// TODO: lets see how many people will notice the lack of this
		// GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
	]),
	makeCache: Options.cacheWithLimits({
		MessageManager: {
			maxSize: 50,
		},
		UserManager: {
			maxSize: 200,
			keepOverLimit: (user) => user.id === user.client.user!.id,
		},
		GuildMemberManager: {
			maxSize: 200,
			keepOverLimit: (member) => member.user.id === member.client.user!.id,
		},
		// Useless props for the bot
		GuildEmojiManager: { maxSize: 0 },
		GuildStickerManager: { maxSize: 0 },
	}),
	sweepers: {
		// Members, users and messages are needed for the bot to function
		guildMembers: {
			interval: (Time.Minute * 15) / 1_000,
			// Sweep all members except the bot member
			filter: () => clientUserFilter,
		},
		users: {
			interval: (Time.Minute * 15) / 1_000,
			// Sweep all users except the bot user
			filter: () => clientUserFilter,
		},
		messages: {
			interval: (Time.Minute * 5) / 1_000,
			lifetime: (Time.Minute * 15) / 1_000,
		},
	},
	caseInsensitiveCommands: true,
	logger: {
		depth: 2,
		level: Reflect.has(process.env, 'PM2_HOME') ? LogLevel.Info : LogLevel.Debug,
	},
	loadMessageCommandListeners: true,
	loadDefaultErrorListeners: false,
});

// Graceful shutdown
for (const event of [
	'SIGTERM', //
	'SIGINT',
] as const)
	process.on(event, async () => {
		container.logger.info(`${event} signal received, shutting down...`);
		await client.destroy();
	});

try {
	await client.login();
} catch (error) {
	container.logger.fatal(container.colors.redBright('Failed to start Highlight'));
	container.logger.error((error as Error).message);
	await client.destroy();
}
