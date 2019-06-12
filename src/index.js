const Client = require("./lib/HighlightClient");
const config = require("../config.json");
require("./StructureExtender");

Client.use(require("klasa-member-gateway"));

Client.defaultGuildSchema
	.add("bannedWords", "string", { array: true })
	.add("bot", folder => folder
		.add("channel", "textchannel")
		.add("redirect", "boolean"));

Client.defaultMemberSchema
	.add("words", "string", { array: true })
	.add("regexes", "string", { array: true })
	.add("blacklistedUsers", "user", { array: true })
	.add("blacklistedChannels", "textchannel", { array: true });

const client = new Client({
	commandEditing: true,
	commandLogging: true,
	disableEveryone: true,
	fetchAllMembers: true,
	disabledEvents: [
		"TYPING_START",
//		"VOICE_STATE_UPDATE",
		"CHANNEL_PINS_UPDATE",
	],
	pieceDefaults: { commands: { deletable: true } },
	presence: {
		activity: {
			name: "for words",
			type: "WATCHING",
		},
	},
	consoleEvents: { verbose: true },
	prefix: "h!",
	restTimeOffset: 0,
	regexPrefix: /^(?:hey |hi )?highlight[,!\w]?/i,
	providers: {
		default: config.provider,
		rethinkdb: config.rethinkdb,
	},
	gateways: {
		clientStorage: { provider: "json"	},
		members: { providers: config.provider },
	},
	schedule: { interval: 1000 },
	disabledCorePieces: ["commands"],
	console: { useColor: true },
});

client.on('debug', client.console.info);

client.login(config.token);
