import '@sapphire/plugin-logger/register';

// Load .env
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'dotenv';
const env = parse(readFileSync(join(__dirname, '../', '.env'))) as { DISCORD_TOKEN: string };
process.env.DISCORD_TOKEN = env.DISCORD_TOKEN;

// Load the rest of the dependencies
import { inspect } from 'util';
import { options, red } from 'colorette';
import { Intents } from 'discord.js';
import { LogLevel } from '@sapphire/framework';
import { Client } from './lib/Client';

inspect.defaultOptions.depth = 2;
options.enabled = true;

const client = new Client({
	presence: {
		activity: {
			name: 'messages fly by!',
			type: 'WATCHING',
		},
	},
	restTimeOffset: 0,
	ws: {
		intents: new Intents([
			Intents.FLAGS.DIRECT_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILDS,
		]),
	},
	messageCacheMaxSize: 50,
	caseInsensitiveCommands: true,
	loadDefaultErrorEvents: true,
	logger: {
		stylize: true,
		depth: 2,
		level: Reflect.has(process.env, 'PM2_HOME') ? LogLevel.Debug : LogLevel.Trace,
	},
});

client.login().catch((error) => {
	client.logger.error(red('Failed to launch the bot:'), error);
	client.destroy();
});
