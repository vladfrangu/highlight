import { Language } from 'klasa';
import { MessageEmbed } from 'discord.js';

export default class extends Language {
	language = {
		PREFIX_REMINDER: (prefix = 'h.') => new MessageEmbed()
			.setColor(0x3669FA)
			.setTitle('Are you lost?')
			.setDescription(`Run **${prefix}**help to see what commands I have`)
			.setThumbnail(this.client.user!.displayAvatarURL()) as unknown as string,
	};
}
