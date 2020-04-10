import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Util } from 'discord.js';
import { pluralize, tryRegex } from '../../lib/utils/Util';

const NEEDS_REGEX = ['list', 'clear'];

@ApplyOptions<CommandOptions>({
	aliases: ['regexes', 'rr', 'regularexpressions'],
	description: 'Control what regular expressions will highlight you',
	permissionLevel: 2,
	runIn: ['text'],
	subcommands: true,
	usage: '<add|remove|clear|list:default> (regularExpression:string)',
	usageDelim: ' ',
})
export default class extends Command {
	async list(message: KlasaMessage) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const regularExpressions = message.member.settings.get('regularExpressions') as string[];

		const embed = new MessageEmbed()
			.setColor(0x3669FA)
			.setDescription("There are no regular expressions you'd want to be highlighted for!");

		if (regularExpressions.length) {
			embed
				.setTitle(`You have __${regularExpressions.length}__ ${pluralize(regularExpressions.length, 'regular expression', 'regular expressions')} added`)
				.setDescription(`- ${regularExpressions.map((r) => Util.escapeMarkdown(r)).join('\n- ')}`);
		}

		return message.send(embed);
	}
	async add(message: KlasaMessage, [regularExpression]: [string]) {
		regularExpression = regularExpression.toLowerCase();
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const previousExpressions = message.member.settings.get('regularExpressions') as string[];

		let added = false;

		const [valid] = tryRegex(regularExpression);
		if (!valid) {
			return message.send(
				new MessageEmbed()
					.setColor(0xCC0F16)
					.setDescription(`Your regular expression (\`${Util.escapeMarkdown(regularExpression, {
						bold: false,
						italic: false,
						spoiler: false,
						strikethrough: false,
						underline: false,
					})}\`) is not valid!
Use a site like [regexr](https://regexr.com/) to validate it and try again!`),
			);
		}

		if (!previousExpressions.includes(regularExpression)) added = true;

		if (added) {
			await message.member.settings.update('regularExpressions', regularExpression, { arrayAction: 'add' });
			message.guild.addRegularExpression(regularExpression, message.author.id);
		}

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No changes have been made..');

		if (added) {
			embed
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`Your regular expression was added to the list: \`${Util.escapeMarkdown(regularExpression, {
					bold: false,
					italic: false,
					spoiler: false,
					strikethrough: false,
					underline: false,
				})}\``)
				.setFooter('Remember; regular expressions are case insensitive!');
		}

		return message.send(embed);
	}

	async remove(message: KlasaMessage, [regularExpression]: [string]) {
		regularExpression = regularExpression.toLowerCase();
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const previousExpressions = [...message.member.settings.get('regularExpressions') as string[]];

		let removed = false;
		if (previousExpressions.includes(regularExpression)) {
			removed = true;
			previousExpressions.splice(previousExpressions.indexOf(regularExpression), 1);
		}

		if (removed) {
			await message.member.settings.update('regularExpressions', previousExpressions, { arrayAction: 'overwrite' });
			message.guild.removeRegularExpression(regularExpression, message.author.id);
		}

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No changes have been made..');

		if (removed) {
			embed
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`Your regular expression was removed from the list: \`${Util.escapeMarkdown(regularExpression, {
					bold: false,
					italic: false,
					spoiler: false,
					strikethrough: false,
					underline: false,
				})}\``);
		}

		return message.send(embed);
	}

	async clear(message: KlasaMessage) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const oldExpressions = message.member.settings.get('regularExpressions') as string[];

		await message.member.settings.reset('regularExpressions');
		message.guild.removeRegularExpressions(oldExpressions, message.author.id);

		return message.send(
			new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('Your regular expression list was reset'),
		);
	}

	async init() {
		this.createCustomResolver('string', async(arg, possible, message, params) => {
			if (NEEDS_REGEX.includes(params[0])) return undefined;
			return this.client.arguments.get('string')!.run(arg, possible, message);
		});
	}
}
