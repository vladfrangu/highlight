import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Util } from 'discord.js';
import { pluralize, tryRegex } from '../../lib/utils/Util';

const NEEDS_REGEX = ['list', 'clear'];

@ApplyOptions<CommandOptions>({
	aliases: ['regexes', 'rr', 'regularexpressions', 'regularexpression'],
	description: 'Control what regular expressions will highlight you',
	permissionLevel: 2,
	runIn: ['text'],
	subcommands: true,
	usage: '<add|remove|clear|list:default> (regularExpression:string)',
	usageDelim: ' ',
	extendedHelp: [
		"→ If you want to see a list of all regular expressions you have",
		'`{prefix}regularexpressions [list]` → Specifying `list` is optional as it is the default subcommand',
		"",
		"→ Adding, or removing a regular expression from your highlighting list",
		"`{prefix}regularexpressions add .*` → Adds the specified regular expression, if it isn't added already.",
		"`{prefix}regularexpressions remove .*` → Removes the specified regular expression, if it was added",
		"",
		"→ Clearing the regular expressions list, if you want to start from scratch",
		"`{prefix}regularexpressions clear`",
		"",
		"*If you like your DMs, don't add* `.*` *or anything similar...*",
	].join('\n'),
})
export default class extends Command {
	needsMember = true;

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
			.setDescription('No new regular expression was added..');

		if (added) {
			embed
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
			.setDescription('No regular expressions have been removed..');

		if (removed) {
			embed
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
