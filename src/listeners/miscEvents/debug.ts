import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
	name: 'DebugLogger',
	event: Events.Debug,
})
export class DebugListener extends Listener<typeof Events.Debug> {
	public override run(message: string) {
		if (/Heartbeat/gi.test(message)) {
			return;
		}

		this.container.logger.debug(`${this.container.colors.cyanBright('discord.js:debug')}: ${message}`);
	}
}
