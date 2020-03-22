import { KlasaMessage, Monitor } from 'klasa';

export default class extends Monitor {
	ignoreBots = true;
	ignoreEdits = true;
	ignoreSelf = true;
	ignoreOthers = false;
	ignoreWebhooks = true;

	async run(message: KlasaMessage) {
		// If we are not in a guild, return early
		if (!message.guild) return null;
		// Check if we have a content, just in case
		if (message.content.length === 0) return null;
		// Check if we have any highlight words or regexes
		const { regularExpressions, words } = message.guild;
		if ((words.size === 0) && (regularExpressions.size === 0)) return null;

		// const sent = new Set<string>();
		const scheduledActions: Array<() => Promise<void>> = [];

		const [parsedRegularExpressions, parsedWords] = await this.client.workers.parseHighlight(message);
		console.log(parsedRegularExpressions, parsedWords);

		await Promise.all(scheduledActions);
		return true;
	}
}
