require("./StructureExtender");
const Client = require("./lib/HighlightClient");
const config = require("../config.json");

const client = new Client({
	cmdEditing: true,
	cmdLogging: true,
	disableEveryone: true,
	fetchAllMembers: true,
	disabledEvents: [
		"TYPING_START",
		"MESSAGE_REACTION_ADD",
		"MESSAGE_REACTION_REMOVE",
		"MESSAGE_REACTION_REMOVE_ALL",
		"VOICE_STATE_UPDATE",
		"CHANNEL_PINS_UPDATE",
	],
	pieceDefaults: {
		commands: { deletable: true },
	},
	presence: {
		activity: {
			name: "for words",
			type: "WATCHING",
		},
	},
});

client.login(config.token);
