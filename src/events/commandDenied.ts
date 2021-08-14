import { CommandDeniedPayload, Event, PreconditionError } from '@sapphire/framework';
import { createErrorEmbed } from '../lib/Util';

export default class extends Event {
	public async run(error: PreconditionError, context: CommandDeniedPayload) {
		await context.message.channel.send(createErrorEmbed(error.message));
	}
}
