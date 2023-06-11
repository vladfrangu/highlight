import '#setup';

import { HighlightClient } from '#structures/HighlightClient';
import { container, LogLevel } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { ActivityType, GatewayIntentBits, IntentsBitField, Options } from 'discord.js';

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
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.Guilds,
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
			interval: Time.Minute * 15,
			// Sweep all members except the bot member
			filter: () => (member) => member.user.id !== member.client.user!.id,
		},
		users: {
			interval: Time.Minute * 15,
			// Sweep all users except the bot user
			filter: () => (user) => user.id !== user.client.user!.id,
		},
		messages: {
			interval: Time.Minute * 5,
			lifetime: Time.Minute * 15,
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

try {
	await client.login();
} catch (err) {
	container.logger.fatal(container.colors.redBright('Failed to start Highlight'));
	container.logger.error((err as Error).message);
	await client.destroy();
}
