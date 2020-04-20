import { Extendable, ExtendableStore } from 'klasa';
import { Message } from 'discord.js';

export default class extends Extendable {
	constructor(store: ExtendableStore, file: string[], directory: string) {
		super(store, file, directory, { appliesTo: [Message] });
	}

	async prompt(this: Message, content: string) {
		const message = await this.channel.send(content);
		const responses = await this.channel.awaitMessages((msg) => msg.author === this.author, { time: 30000, max: 1 });
		message.delete().catch((error) => this.client.emit('wtf', error));
		if (responses.size === 0) throw this.language.get('MESSAGE_PROMPT_TIMEOUT');
		return responses.first();
	}
}

declare module 'discord.js' {
	interface Message {
		prompt(content: string): Promise<Message>;
	}
}
