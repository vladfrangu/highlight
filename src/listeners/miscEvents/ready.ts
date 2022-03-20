import { pluralize } from '#utils/misc';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, LogLevel } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { Permissions } from 'discord.js';
import { readFile } from 'node:fs/promises';

@ApplyOptions<Listener.Options>({
	name: 'ReadyLogger',
	event: Events.ClientReady,
})
export class ClientReadyListener extends Listener<typeof Events.ClientReady> {
	public override async run() {
		const { client, colors, logger } = this.container;

		const asciiArt = [
			'  _    _ _       _     _ _       _     _   ',
			' | |  | (_)     | |   | (_)     | |   | |  ',
			' | |__| |_  __ _| |__ | |_  __ _| |__ | |_ ',
			" |  __  | |/ _` | '_ \\| | |/ _` | '_ \\| __|",
			' | |  | | | (_| | | | | | | (_| | | | | |_ ',
			' |_|  |_|_|\\__, |_| |_|_|_|\\__, |_| |_|\\__|',
			'            __/ |           __/ |          ',
			'           |___/           |___/           ',
		].map((item) => colors.yellow(item));

		const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'));
		const versionString = `${colors.magenta('Version: ')}${colors.green(`v${packageJson.version}`)} ${colors.magenta(
			'-',
		)} ${colors.blueBright('Sapphire and Application Command Edition')}`;

		const userTagInColor = `${colors.magenta('Logged in as: ')}${colors.cyanBright(client.user!.tag)} (${colors.green(
			client.user!.id,
		)})`;

		const finalMessageToLog = [
			...asciiArt, //
			'',
			`  ${versionString}`,
			'',
			userTagInColor,
			`${colors.magenta('               Guild count: ')}${colors.cyanBright(
				client.guilds.cache.size.toLocaleString(),
			)}`,
			`${colors.magenta('        Invite application: ')}${colors.cyanBright(
				client.generateInvite({
					scopes: ['bot', 'applications.commands'],
					permissions: new Permissions([
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.ReadMessageHistory,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.EmbedLinks,
					]),
				}),
			)}`,
			`${colors.magenta('             Public prefix: ')}${colors.cyanBright('/')}`,
			`${colors.magenta('  Developer command prefix: ')}${colors.cyanBright(`@${client.user!.username}`)}`,
		];

		for (const entry of finalMessageToLog) {
			logger.info(entry);
		}

		if (client.guilds.cache.size && logger.has(LogLevel.Debug)) {
			logger.debug('');
			logger.debug(`${colors.magenta('  Guilds: ')}`);
			for (const guild of client.guilds.cache.values()) {
				logger.debug(
					`    - ${colors.cyanBright(guild.name)} (${colors.green(guild.id)}) with ${colors.green(
						guild.memberCount.toLocaleString(),
					)} ${pluralize(guild.memberCount, 'member', 'members')}`,
				);
			}
		}
	}
}
