import { ApplyOptions } from '@sapphire/decorators';
import { Event, EventOptions } from '@sapphire/framework';
import { cyanBright, green, magenta, yellow } from 'colorette';
import type { Client } from 'discord.js';
@ApplyOptions<EventOptions>({
	once: true,
	event: 'ready',
})
export default class ReadyEvent extends Event {
	public async run() {
		const { client } = this.context;
		const { user, logger, fetchPrefix } = client;
		const prefix = await fetchPrefix({} as any);

		[
			'',
			yellow('  _    _ _       _     _ _       _     _   '),
			yellow(' | |  | (_)     | |   | (_)     | |   | |  '),
			yellow(' | |__| |_  __ _| |__ | |_  __ _| |__ | |_ '),
			yellow(" |  __  | |/ _` | \\_ \\| | |/ _` | '_ \\| __|"),
			yellow(' | |  | | | (_| | | | | | | (_| | | | | |_ '),
			yellow(' |_|  |_|_|\\__, |_| |_|_|_|\\__, |_| |_|\\__|'),
			yellow('            __/ |           __/ |          '),
			yellow('           |___/           |___/           '),
			'',
			`Logged in as ${cyanBright(user!.tag)} (${green(user!.id)})`,
			`  Prefix: ${cyanBright(prefix as string)}`,
		].forEach((item) => {
			logger.info(magenta(item));
		});

		try {
			await client.schedule.init();
			await this.initTasks(client);
			await client.highlightManager.init();
		} catch (error) {
			client.emit('wtf', error);
		}
	}

	private async initTasks({ schedule }: Client) {
		if (!schedule.queue.some((item) => item.taskID === 'sweepCache')) {
			await schedule.add('sweepCache', '*/10 * * * *');
		}
	}
}
