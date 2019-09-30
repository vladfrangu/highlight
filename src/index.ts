import './lib/Extender';
import * as config from '../config';
import HighlightClient from './lib/structures/Client';

HighlightClient.defaultGuildSchema
	.add('bot', (folder) => folder
		.add('channel', 'textchannel')
		.add('redirect', 'boolean')
	);

HighlightClient.defaultUserSchema
	.add('words', 'string', { array: true })
	.add('regularExpressions', 'string', { array: true });

HighlightClient.defaultMemberSchema
	.add('blacklist', (folder) => folder
		.add('users', 'user', { array: true })
		.add('channels', 'textchannel', { array: true })
	);

new HighlightClient({
	commandEditing: true,
	commandLogging: true,
	disableEveryone: true,
	disabledEvents: [
		'CHANNEL_PINS_UPDATE',
		'GUILD_BAN_ADD',
		'GUILD_BAN_REMOVE',
		'GUILD_EMOJIS_UPDATE',
		'GUILD_INTEGRATIONS_UPDATE',
		'PRESENCE_UPDATE',
		'TYPING_START',
		'VOICE_STATE_UPDATE',
	],
	console: { useColor: true },
	consoleEvents: {
		verbose: true,
	},
	createPiecesFolders: false,
	gateways: {
		clientStorage: { provider: 'json' },
		members: { provider: config.provider },
	},
	messageCacheLifetime: 120,
	messageSweepInterval: 600,
	noPrefixDM: true,
	prefix: 'h!!',
	prefixCaseInsensitive: true,
	providers: {
		default: config.provider,
		rethinkdb: config.rethinkdb,
	},
	readyMessage: (client) => `[${client.user!.tag}] :: READY => [${client.guilds.size} Guilds] :: [${client.guilds.reduce((acc, guild) => acc + guild.members.size, 0)} Users on Ready]`,
	regexPrefix: /^((?:(hey|hi) )?highlight[,!\w]?)/i,
	restTimeOffset: 0,
	retryLimit: 10,
	schedule: { interval: 1000 },
})
	.login(config.token);
