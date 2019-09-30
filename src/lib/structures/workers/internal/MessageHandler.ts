import re2 from 're2';
import RestManager from './Manager';
// eslint-disable-next-line
const DJSRestManager = require('discord.js/src/rest/RESTManager.js');

export default class MessageHandler {
	botToken: string;
	/**
	 * Map of guildID => value(oneof regex|word) => set<user ID>
	 */
	raw = new Map<string, Map<string, Set<string>>>();

	manager: RestManager;

	constructor(botToken: string) {
		this.botToken = botToken;
		// TODO: Maybe dont have a manager per worker, just return the message to the main shard to send the dm
		this.manager = new (DJSRestManager as typeof RestManager)({
			options: {
				restSweepInterval: 120000,
			},
			token: botToken,
			emit: () => undefined,
			listenerCount: () => 0,
			// @ts-ignore
			setInterval: (...args) => setInterval(...args),
		});
	}
}
