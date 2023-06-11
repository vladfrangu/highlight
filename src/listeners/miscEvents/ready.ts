import { InviteButton, inviteOptions, packageJsonFile, pluralize } from '#utils/misc';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, LogLevel } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	name: 'ReadyLogger',
	event: Events.ClientReady,
	once: true,
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

		this.container.clientInvite = client.generateInvite(inviteOptions);

		// Set the invite button to include the generated invite link
		InviteButton.setURL(this.container.clientInvite);

		const versionString = `${colors.magenta('Version: ')}${colors.green(
			`v${packageJsonFile.version}`,
		)} ${colors.magenta('-')} ${colors.blueBright('Sapphire and Application Command Edition')}`;

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
			`${colors.magenta('        Invite application: ')}${colors.cyanBright(this.container.clientInvite)}`,
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

		await this.container.highlightManager.updateAllCaches();
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		clientInvite: string;
	}
}
