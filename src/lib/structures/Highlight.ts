import { Client } from 'klasa';
import { Client as MemberClient } from 'klasa-member-gateway';
import { Workers } from '../workers/Workers';

Client.use(MemberClient);

export class Highlight extends Client {
	workers = new Workers(this);

	async destroy() {
		await this.workers.destroy();
		return super.destroy();
	}
}

declare module 'discord.js' {
	interface Client {
		workers: Workers;
	}

	interface WebSocketOptions {
		intents: number;
	}
}
