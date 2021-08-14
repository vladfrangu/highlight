import { ApplyOptions } from '@sapphire/decorators';
import { Event, EventOptions } from '@sapphire/framework';
import { red } from 'colorette';

@ApplyOptions<EventOptions>({ event: 'wtf' })
export default class WtfEvent extends Event {
	public run(message: Error | string) {
		this.context.client.logger.warn(red('Encountered unexpected error'), message);
	}
}
