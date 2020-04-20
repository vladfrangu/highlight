import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Util } from 'discord.js';

@ApplyOptions<CommandOptions>({
	description: 'Changes the server prefix',
	runIn: ['text'],
	usage: '[prefix:string{,12}]',
	permissionLevel: 6,
	extendedHelp: [
		"→ If you want to see the current prefix in the server",
		'`{prefix}allowedroles prefix`',
		"→ Changing the server prefix to anything you'd like",
		"`{prefix}prefix owo.`",
	].join('\n'),
})
export default class extends Command {
	async run(message: KlasaMessage, [prefix]: [string | undefined]) {
		if (!message.guild) throw new Error('Unreachable');
		if (prefix) {
			await message.guild.settings.update("prefix", prefix);
			return message.send(new MessageEmbed()
				.setColor(0x43B581)
				.setDescription(`You can now use \`${Util.escapeMarkdown(prefix)}\` to run commands in this server`)
				.setFooter("I'll still answer to commands if you mention me"),
			);
		}

		return message.send(
			new MessageEmbed()
				.setColor(0x3669FA)
				.setDescription(`The current server prefix is \`${Util.escapeMarkdown(message.guild.settings.get('prefix') as string)}\``),
		);
	}
}
