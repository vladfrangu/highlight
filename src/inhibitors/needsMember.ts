import { Inhibitor, KlasaMessage, Command } from 'klasa';

export default class extends Inhibitor {
	async run(message: KlasaMessage, command: Command) {
		if (message.guild && command.needsMember) {
			await message.guild.members.fetch(message.author.id);
			await message.member!.settings.sync(true);
		}
	}
}

declare module 'klasa' {
	interface Command {
		needsMember?: boolean;
	}
}
