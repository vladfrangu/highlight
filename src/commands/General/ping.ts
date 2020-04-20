import { Command, KlasaMessage } from 'klasa';

export default class extends Command {
	description = 'Ping, pong, is the bot alive?';

	async run(message: KlasaMessage) {
		const msg = await message.sendLocale("COMMAND_PING");
		return message.sendLocale("COMMAND_PINGPONG", [(msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp), Math.round(this.client.ws.ping)]);
	}
}
