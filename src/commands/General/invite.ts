import { Command, KlasaMessage } from 'klasa';
import { MessageEmbed } from 'discord.js';

export default class extends Command {
	description = 'Gives you the invite link needed to add the bot to your server!';

	async run(message: KlasaMessage) {
		return message.send(
			new MessageEmbed()
				.setColor(0x3669FA)
				.setTitle('Thanks for choosing me!')
				.setDescription(`Click [here](https://discordapp.com/api/oauth2/authorize?client_id=${this.client.user!.id}&permissions=84992&scope=bot) to add me to your server! 😄`)
				.setThumbnail(this.client.user!.displayAvatarURL({ size: 512 })),
		);
	}
}
