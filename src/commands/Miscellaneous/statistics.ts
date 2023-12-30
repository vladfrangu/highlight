import process from 'node:process';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, version as sapphireVersion } from '@sapphire/framework';
import type { Message } from 'discord.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	bold,
	version as discordJsVersion,
	hyperlink,
	italic,
} from 'discord.js';
import ts from 'typescript';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { InviteButton, SupportServerButton, packageJsonFile } from '#utils/misc';

const { version: typescriptVersion } = ts;

@ApplyOptions<Command.Options>({
	aliases: ['stats'],
	description: 'Find out some statistics about this application',
})
export class StatisticsCommand extends Command {
	public override async messageRun(message: Message) {
		return this._sharedRun(message, true);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction<'cached'>) {
		return this._sharedRun(interaction, false);
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((statistics) =>
			statistics.setName(this.name).setDescription(this.description),
		);
	}

	protected async _sharedRun(
		messageOrInteraction: Command.ChatInputCommandInteraction<'cached'> | Message,
		isMessage: boolean,
	) {
		const embed = createInfoEmbed(
			[
				`Here is some of that ${italic('juicy')} data about Highlight ${bold(
					`v${packageJsonFile.version}`,
				)} - Sapphire Edition, built by ${hyperlink('@vladdy', 'https://github.com/vladfrangu')}!`,
			].join('\n'),
		).setFields(
			{
				name: 'Built using these amazing tools',
				value: [
					`• ${hyperlink('node.js', 'https://nodejs.org/')} ${bold(process.version)} & ${hyperlink(
						'TypeScript',
						'https://typescriptlang.org/',
					)} ${bold(`v${typescriptVersion}`)}`,
					`• ${hyperlink('discord.js', 'https://discord.js.org/')} ${bold(`v${discordJsVersion}`)}`,
					`• ${hyperlink('Sapphire Framework', 'https://sapphirejs.dev/')} ${bold(`v${sapphireVersion}`)}`,
				].join('\n'),
			},
			{
				name: 'Handling highlights for the following',
				value: [
					`• Shards: ${bold((this.container.client.options.shardCount ?? 1).toLocaleString())}`,
					`• Servers: ${bold(this.container.client.guilds.cache.size.toLocaleString())}`,
					`• Users: ${bold(
						this.container.client.guilds.cache
							.reduce((acc, curr) => acc + curr.memberCount, 0)
							.toLocaleString(),
					)}`,
				].join('\n'),
			},
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
						new ActionRowBuilder<ButtonBuilder>().setComponents(InviteButton, SupportServerButton),
						new ActionRowBuilder<ButtonBuilder>().setComponents(
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setURL('https://github.com/vladfrangu/highlight')
								.setLabel('GitHub Repository')
								.setEmoji({
									name: 'github',
									id: '950169270896197633',
								}),
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setURL('https://github.com/sponsors/vladfrangu')
								.setLabel('Donate')
								.setEmoji({
									name: '💙',
								}),
						),
					],
				},
			}),
		);
	}
}
