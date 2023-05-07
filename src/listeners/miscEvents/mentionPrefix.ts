import { createInfoEmbed } from '#utils/embeds';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { bold, inlineCode, italic, type Message } from 'discord.js';

const phrases = [
	"It's dangerous to go alone, let me help you...",
	'You seem lost, adventurer...',
	'Can I give you a hand?',
	'Vladdy (my creator) told me to always help you if you were lost!',
	'Here, it seems that you dropped this ping...',
	'Did you lose your highlighter too? 😔',
	'Hi! Did you want to tell me something? 👂',
	'',
];

const amnesia = 'Well...this is awkward, I forgot the phrase I was going to say...';

@ApplyOptions<Listener.Options>({
	name: 'MentionPrefixOnlyListener',
	event: Events.MentionPrefixOnly,
})
export class MentionPrefixOnly extends Listener<typeof Events.MentionPrefixOnly> {
	public override async run(message: Message) {
		const randomEntry = phrases.at(Math.floor(Math.random() * phrases.length)) || amnesia;

		await message.reply({
			embeds: [
				createInfoEmbed(
					[
						italic(randomEntry),
						'',
						`If you don't remember what commands I have, run my ${bold(inlineCode('/help'))} slash command!`,
						`If that doesn't work, try ${bold(inlineCode(`@${this.container.client.user!.username} help`))}!`,
					].join('\n'),
				),
			],
		});
	}
}
