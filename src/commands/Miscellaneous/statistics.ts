import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { bold, hyperlink, italic } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, version as sapphireVersion } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { Message, MessageActionRow, MessageButton, Permissions } from 'discord.js';
import { readFile } from 'node:fs/promises';
import typescript from 'typescript';

const { version: typescriptVersion } = typescript;
const discordJsVersion = JSON.parse(
	await readFile(new URL('../../../node_modules/discord.js/package.json', import.meta.url), 'utf8'),
).version;

const highlightVersion = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')).version;

@ApplyOptions<Command.Options>({
	aliases: ['stats'],
	description: 'Find out some statistics about this application',
	chatInputCommand: {
		register: true,
		guildIds: useDevelopmentGuildIds(),
		idHints: [
			// HighlightDev - Sapphire Guild Command
			'950174971618005062',
		],
	},
})
export class StatisticsCommand extends Command {
	public override messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override chatInputRun(interaction: Command.ChatInputInteraction<'cached'>) {
		return this._sharedRun(interaction, false);
	}

	protected async _sharedRun(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		isMessage: boolean,
	) {
		const invite = this.container.client.generateInvite({
			scopes: ['bot', 'applications.commands'],
			permissions: new Permissions([
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.EmbedLinks,
			]),
		});

		// guild, user count?

		const embed = createInfoEmbed(
			[
				`Here is some of that ${italic('juicy')} data about Highlight ${bold(
					`v${highlightVersion}`,
				)} - Sapphire Edition, built by ${hyperlink('Vladdy#0002', 'https://github.com/vladfrangu')}!`,
			].join('\n'),
		)
			.addField(
				'Built using these amazing tools',
				[
					`• ${hyperlink('node.js', 'https://nodejs.org/')} ${bold(process.version)} & ${hyperlink(
						'TypeScript',
						'https://typescriptlang.org/',
					)} ${bold(`v${typescriptVersion}`)}`,
					`• ${hyperlink('discord.js', 'https://discord.js.org/#/')} ${bold(`v${discordJsVersion}`)}`,
					`• ${hyperlink('Sapphire Framework', 'https://sapphirejs.dev/')} ${bold(`v${sapphireVersion}`)}`,
				].join('\n'),
			)
			.addField(
				'Handling highlights for the following',
				[
					`• Shards: ${bold((this.container.client.options.shardCount ?? 1).toLocaleString())}`,
					`• Servers: ${bold(this.container.client.guilds.cache.size.toLocaleString())}`,
					`• Users: ${bold(
						this.container.client.guilds.cache.reduce((acc, curr) => acc + curr.memberCount, 0).toLocaleString(),
					)}`,
				].join('\n'),
			);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					embeds: [embed],
					ephemeral: true,
					components: [
						new MessageActionRow().addComponents(
							new MessageButton().setStyle('LINK').setURL(invite).setLabel('Add me to your server!').setEmoji('🎉'),
							new MessageButton()
								.setStyle('LINK')
								.setURL(process.env.SUPPORT_SERVER_INVITE ?? 'https://discord.gg/C6D9bge')
								.setLabel('Support server')
								.setEmoji('🆘'),
						),
						new MessageActionRow().addComponents(
							new MessageButton()
								.setStyle('LINK')
								.setURL('https://github.com/vladfrangu/highlight')
								.setLabel('GitHub Repository')
								.setEmoji('<:github:950169270896197633>'),
							new MessageButton()
								.setStyle('LINK')
								.setURL('https://github.com/sponsors/vladfrangu')
								.setLabel('Donate')
								.setEmoji('💙'),
						),
					],
				},
			}),
		);
	}
}
