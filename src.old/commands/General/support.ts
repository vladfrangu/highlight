import { Command, KlasaMessage } from 'klasa';
import { MessageEmbed } from 'discord.js';

export default class extends Command {
	description = 'Gives you an invite link to the support server, if needed';

	async run(message: KlasaMessage) {
		return message.send(
			new MessageEmbed()
				.setColor(0x3669FA)
				.setTitle('Need some help with Highlight?')
				.setDescription("We're here to help! You can join the support server by clicking [here](https://discord.gg/C6D9bge)!"),
		);
	}
}
