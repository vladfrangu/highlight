import './lib/Extender';
import * as config from './config';
import { Highlight } from './lib/structures/Highlight';
import { Intents } from './lib/structures/Intents';

Highlight.defaultGuildSchema
	.add('bot', (folder) => folder
		.add('channel', 'TextChannel')
		.add('redirect', 'Boolean'),
	)
	.add('permissions', (folder) => folder
		.add('requiresRole', 'Boolean')
		.add('allowedRoles', 'Role', { array: true }),
	);

Highlight.defaultMemberSchema
	.add('words', 'String', { array: true })
	.add('regularExpressions', 'string', { array: true })
	.add('blacklist', (folder) => folder
		.add('users', 'user', { array: true })
		.add('channels', 'textchannel', { array: true })
	);

Highlight.defaultClientSchema
	.add('migrated', 'Boolean', { configurable: false, default: false });

const client = new Highlight({
	commandEditing: true,
	commandLogging: true,
	console: { useColor: true },
	consoleEvents: { verbose: true },
	createPiecesFolders: false,
	disableEveryone: true,
	fetchAllMembers: true,
	messageCacheLifetime: 120,
	messageSweepInterval: 600,
	noPrefixDM: true,
	prefix: 'h.',
	prefixCaseInsensitive: true,
	presence: {
		activity: {
			name: 'messages zoom through',
			type: 'WATCHING',
		},
	},
	providers: {
		default: config.provider,
		rethinkdb: config.rethinkdb,
	},
	readyMessage: (readyClient) => `[${readyClient.user!.tag}] :: READY => [${readyClient.guilds.size} Guilds] :: [${readyClient.guilds.reduce((acc, guild) => acc + guild.members.size, 0)} Users on Ready]`,
	// eslint-disable-next-line prefer-named-capture-group
	regexPrefix: /^((?:(hey|hi) )?highlight[,!\w]?)/i,
	restTimeOffset: 0,
	retryLimit: 10,
	schedule: { interval: 1000 },
	settings: {
		gateways: {
			clientStorage: { provider: 'json' },
			members: { provider: config.provider },
		},
	},
	ws: {
		intents: new Intents([
			'DIRECT_MESSAGES',
			'GUILDS',
			'GUILD_MEMBERS',
			'GUILD_MESSAGES',
			'GUILD_MESSAGE_REACTIONS',
		]).bitfield,
	},
});

client.on('debug', (message) => {
	if (/Heartbeat/gi.test(message)) return null;
	client.console.verbose(message);
	return null;
});

client.login(config.token)
	.catch((error: Error) => {
		client.console.error('Failed to connect to Discord', error);
		return client.destroy();
	});
