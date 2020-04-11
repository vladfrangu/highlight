/* eslint-disable @typescript-eslint/no-floating-promises */
import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { MessageEmbed, TextChannel, Permissions, Util } from 'discord.js';
import { isFunction } from '@klasa/utils';
import { ApplyOptions } from '@skyra/decorators';

@ApplyOptions<CommandOptions>({
	aliases: ['commands', 'cmd', 'cmds'],
	description: 'Helps you out by showing what commands are available!',
	usage: '(Command:command)',
})
export default class extends Command {
	async run(message: KlasaMessage, [command]: [Command | undefined]) {
		if (command) {
			const prefix = message.guildSettings.get('prefix') as string;
			const embed = new MessageEmbed()
				.setColor(0x3669FA)
				.setTitle(`Help for the __${command.name}__ command`)
				.setDescription(`→ ${isFunction(command.description) ? command.description(message.language) : command.description}`)
				.addField(
					'Usage',
					`${Util.escapeMarkdown(prefix)}${command.usage.nearlyFullUsage}`,
				)
				.addField('Examples', ((isFunction(command.extendedHelp) ? command.extendedHelp(message.language) : command.extendedHelp) || 'No need for examples, just run it!').replace(/\{prefix\}/g, prefix));

			return message.sendMessage(embed);
		}

		if (!('all' in message.flagArgs) && message.guild && (message.channel as TextChannel).permissionsFor(this.client.user!)?.has(Permissions.FLAGS.EMBED_LINKS))
			return message.send(await this.buildEmbed(message));

		return message.author.send(await this.buildHelp(message), { split: { char: '\n' } })
			.then(() => { if (message.channel.type !== 'dm') message.sendMessage(message.language.get('COMMAND_HELP_DM')); return null; })
			.catch(() => { if (message.channel.type !== 'dm') message.sendMessage(message.language.get('COMMAND_HELP_NODM')); return null; });
	}

	async buildHelp(message: KlasaMessage) {
		const commands = await this._fetchCommands(message);
		const prefix = message.guildSettings.get('prefix') as string;

		const helpMessage = [];
		for (const [category, list] of commands)
			helpMessage.push(`**${category} Commands**:\n`, list.map(this.formatCommand.bind(this, message, prefix)).join('\n'), '');


		return helpMessage.join('\n');
	}

	async buildEmbed(message: KlasaMessage) {
		const commands = await this._fetchCommands(message);
		const prefix = message.guildSettings.get('prefix') as string;
		const color = message.member!.displayColor;
		const embed = new MessageEmbed()
			.setColor(color)
			.setDescription(`Run \`${prefix}help <command>\` to find out more about a command`);
		for (const [category, list] of commands) {
			embed
				.addField(`${category} Commands`, list.map(this.formatCommand.bind(this, message, prefix)).join('\n'), true);
		}

		return embed;
	}

	formatCommand(message: KlasaMessage, prefix: string, command: Command) {
		const description = isFunction(command.description) ? command.description(message.language) : command.description;
		return `• **${prefix}${command.name}** → ${description}`;
	}

	async _fetchCommands(message: KlasaMessage) {
		const run = this.client.inhibitors.run.bind(this.client.inhibitors, message);
		const commands = new Map();
		await Promise.all(this.client.commands.map((command) => run(command, true)
			.then(() => {
				const category = commands.get(command.category);
				if (category) category.push(command);
				else commands.set(command.category, [command]);
			}).catch(() => {
				// Noop
			}),
		));

		return commands;
	}

	async init() {
		this.createCustomResolver('command', (arg, possible, message) => {
			if (!arg || arg === '') return undefined;
			return this.client.arguments.get('command')!.run(arg, possible, message);
		});
	}
}
