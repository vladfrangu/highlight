import { Command, CommandOptions, KlasaMessage, KlasaGuild } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Util, GuildMember } from 'discord.js';
import { pluralize } from '../../lib/utils/Util';

@ApplyOptions<CommandOptions>({
	aliases: ['i'],
	description: 'Import your words or regular expressions from a different guild.',
	permissionLevel: 2,
	runIn: ['text'],
	usage: '<regex|words|everything:default> <guild:guild>',
	usageDelim: ' ',
	extendedHelp: [
		"→ If you want to import all words and regular expressions from a guild",
		'`{prefix}import [everything] 479665229396049920` → Specifying `everything` is optional as it is the default subcommand',
		"",
		"→ If you want to import words from a guild",
		"`{prefix}import words 479665229396049920` → Adds your words from that guild, if they aren't added already.",
		"→ Importing your regular expressions from a guild",
		"`{prefix}import regex 479665229396049920` → Adds your regular expressions from that guild, if they aren't added already.",
	].join('\n'),
	subcommands: true,
})
export default class extends Command {
	needsMember = true;

	async everything(message: KlasaMessage, [guild]: [KlasaGuild]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const member = await guild.members.fetch(message.author).catch(() => null);

		if (!member) {
			return message.send(new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('You do not appear to be in that guild.'),
			);
		}

		await member.settings.sync(true);

		const addedWords = await this._words(message, member);
		const addedExpressions = await this._regex(message, member);

		const added = [...addedWords, ...addedExpressions];

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No new words or regular expressions have been imported..');

		if (added.length) {
			embed.setTitle(`The following words or regular expressions have been added to your list`)
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`- \`${added.sort().map((word) => Util.escapeMarkdown(word)).join('`\n- `')}\``);
		}

		return message.send(embed);
	}

	async words(message: KlasaMessage, [guild]: [KlasaGuild]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const member = await guild.members.fetch(message.author);

		if (!member) {
			return message.send(new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('You do not appear to be in that guild.'),
			);
		}

		await member.settings.sync(true);

		const addedWords = await this._words(message, member);

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No new words have been added..');

		if (addedWords.length) {
			embed.setTitle(`The following ${pluralize(addedWords.length, 'word has', 'words have')} been added to your list`)
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`- ${addedWords.sort().map((word) => Util.escapeMarkdown(word)).join('\n- ')}`);
		}

		return message.send(embed);
	}

	async regex(message: KlasaMessage, [guild]: [KlasaGuild]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const member = await guild.members.fetch(message.author).catch(() => null);

		if (!member) {
			return message.send(new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('You do not appear to be in that guild.'),
			);
		}

		await member.settings.sync(true);

		const addedExpressions = await this._regex(message, member);

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No new regular expressions were added..');

		if (addedExpressions.length) {
			embed
				.setTitle(`The following ${pluralize(addedExpressions.length, 'expression has', 'expressions have')} been added to your list`)
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`- \`${addedExpressions.sort().map((expression) => Util.escapeMarkdown(expression, {
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

	async _words(message: KlasaMessage, member: GuildMember) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const words = member.settings.get('words') as string[];

		const previousWords = message.member.settings.get('words') as string[];

		const addedWords = [];

		for (const word of words)
			if (!previousWords.includes(word)) addedWords.push(word);

		await message.member.settings.update('words', addedWords, { arrayAction: 'add' });
		message.guild.addWords(addedWords, message.author.id);

		return addedWords;
	}

	async _regex(message: KlasaMessage, member: GuildMember) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const regularExpressions = member.settings.get('regularExpressions') as string[];

		const previousExpressions = message.member.settings.get('regularExpressions') as string[];

		const addedExpressions = [];

		for (const regex of regularExpressions)
			if (!previousExpressions.includes(regex)) addedExpressions.push(regex);

		await message.member.settings.update('regularExpressions', addedExpressions, { arrayAction: 'add' });
		message.guild.addRegularExpressions(addedExpressions, message.author.id);

		return addedExpressions;
	}
}
