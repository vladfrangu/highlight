import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Util } from 'discord.js';
import { pluralize } from '../../lib/utils/Util';

const NEEDS_WORD = ['list', 'clear'];

@ApplyOptions<CommandOptions>({
	aliases: ['word', 'w'],
	description: 'Control what words will highlight you',
	permissionLevel: 2,
	runIn: ['text'],
	subcommands: true,
	usage: '<add|remove|set|clear|list:default> (words:string) [...]',
	usageDelim: ' ',
	extendedHelp: [
		"→ If you want to see a list of all words you have",
		'`{prefix}words [list]` → Specifying `list` is optional as it is the default subcommand',
		"",
		"→ Adding, or removing a word (or multiple words) from your highlighting list",
		"`{prefix}words add hi vlad` → Adds the specified words, if they aren't added already.",
		"`{prefix}words remove vlad` → Removes the specified words, if they were added",
		"",
		"→ Clearing the word list, if you want to start from scratch",
		"`{prefix}words clear`",
	].join('\n'),
})
export default class extends Command {
	needsMember = true;

	async list(message: KlasaMessage) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const words = message.member.settings.get('words') as string[];

		const embed = new MessageEmbed()
			.setColor(0x3669FA)
			.setDescription("There are no words you'd want to be highlighted for!");

		if (words.length) {
			embed
				.setTitle(`You have __${words.length}__ ${pluralize(words.length, 'word', 'words')} added`)
				.setDescription(`- ${words.map((word) => Util.escapeMarkdown(word)).join('\n- ')}`);
		}

		return message.send(embed);
	}
	async add(message: KlasaMessage, words: string[]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const previousWords = message.member.settings.get('words') as string[];
		// Make sure there are no duplicates
		const wordSet = new Set(words.map((it) => it.toLowerCase()));

		const addedWords = [];

		for (const word of wordSet)
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

	async remove(message: KlasaMessage, words: string[]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const previousWords = [...message.member.settings.get('words') as string[]];
		// Make sure there are no duplicates
		const wordSet = new Set(words.map((it) => it.toLowerCase()));

		const removed = new Set<string>();

		for (const word of wordSet) {
			const index = previousWords.indexOf(word);
			if (index === -1) continue;
			removed.add(word);
			previousWords.splice(index, 1);
		}

		await message.member.settings.update('words', previousWords, { arrayAction: 'overwrite' });
		message.guild.removeWords([...removed], message.author.id);

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No words have been removed..');

		if (removed.size) {
			embed.setTitle(`The following ${pluralize(removed.size, 'word', 'words')} have been removed from your list`)
				// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
				.setDescription(`- ${[...removed].sort().map((word) => Util.escapeMarkdown(word)).join('\n- ')}`);
		}

		return message.send(embed);
	}

	async set(message: KlasaMessage, words: string[]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const old = message.member.settings.get('words') as string[];
		// Make sure there are no duplicates
		const wordSet = new Set(words.map((it) => it.toLowerCase()));

		await message.member.settings.update('words', [...wordSet], { arrayAction: 'overwrite' });
		message.guild.removeWords(old, message.author.id);
		message.guild.addWords([...wordSet], message.author.id);

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setTitle(`The following ${pluralize(wordSet.size, 'word', 'words')} have been set in your list`)
			// eslint-disable-next-line @typescript-eslint/require-array-sort-compare
			.setDescription(`- ${[...wordSet].sort().map((word) => Util.escapeMarkdown(word)).join('\n- ')}`);

		return message.send(embed);
	}

	async clear(message: KlasaMessage) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const oldWords = message.member.settings.get('words') as string[];

		await message.member.settings.reset('words');
		message.guild.removeWords(oldWords, message.author.id);

		return message.send(
			new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('Your word list was reset'),
		);
	}

	async init() {
		this.createCustomResolver('string', async(arg, possible, message, params) => {
			if (NEEDS_WORD.includes(params[0])) return undefined;
			return this.client.arguments.get('string')!.run(arg, possible, message);
		});
	}
}
