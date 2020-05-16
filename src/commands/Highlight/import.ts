import { Command, CommandOptions, KlasaMessage, KlasaGuild } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Util } from 'discord.js';
import { pluralize } from '../../lib/utils/Util';

@ApplyOptions<CommandOptions>({
	aliases: ['i'],
	description: 'Import your words from a different Guild.',
	permissionLevel: 2,
	runIn: ['text'],
	usage: '<regex|words:default> <Guild:guild>',
	extendedHelp: [
		"→ If you want to import words from a guild",
		'`{prefix}import [words] 479665229396049920` → Specifying `words` is optional as it is the default subcommand',
		"",
		"→ Importing your regular expressions from a guild",
		"`{prefix}import regex 479665229396049920` → Adds your regular expressions from that guild, if they aren't added already.",
	].join('\n'),
})
export default class extends Command {
	needsMember = true;

	async words(message: KlasaMessage, [guild]: KlasaGuild[]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const member = await guild.members.fetch(message.author);

		if (!member) {
			return message.send(new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('You do not appear to be in that guild.'),
			);
		}

		const words = member.settings.get('words') as string[];

		const previousWords = message.member.settings.get('words') as string[];

		const addedWords = [];

		for (const word of words)
			if (!previousWords.includes(word)) addedWords.push(word);

		await message.member.settings.update('words', addedWords, { arrayAction: 'add' });
		message.guild.addWords(addedWords, message.author.id);

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No new words have been added..');

		if (addedWords.length) {
			embed.setTitle(`The following ${pluralize(addedWords.length, 'word', 'words')} have been added to your list`)
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`- ${addedWords.sort().map((word) => Util.escapeMarkdown(word)).join('\n- ')}`);
		}

		return message.send(embed);
	}

	async regex(message: KlasaMessage, [guild]: KlasaGuild[]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const member = await guild.members.fetch(message.author);

		if (!member) {
			return message.send(new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('You do not appear to be in that guild.'),
			);
		}

		const regularExpressions = member.settings.get('regularExpressions') as string[];

		const previousExpressions = message.member.settings.get('regularExpressions') as string[];

		const added = [];

		for (const regex of regularExpressions)
			if (!previousExpressions.includes(regex)) added.push(regex);

		if (added.length) {
			await message.member.settings.update('words', added, { arrayAction: 'add' });
			for (const regex of added) message.guild.addRegularExpression(regex, message.author.id);
		}

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No new regular expressions were added..');

		if (added.length) {
			embed
				.setTitle(`The following ${pluralize(added.length, 'expression', 'expressions')} have been added to your list`)
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`- \`${added.sort().map((expression) => Util.escapeMarkdown(expression, {
					bold: false,
					italic: false,
					spoiler: false,
					strikethrough: false,
					underline: false,
				})).join('`\n- `')}\``)
				.setFooter('Remember; regular expressions are case insensitive!');
		}

		return message.send(embed);
	}
}
