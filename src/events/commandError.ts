import { CommandDeniedPayload, Event } from '@sapphire/framework';
import { UserError } from '../lib/structures/UserError';
import { createErrorEmbed } from '../lib/Util';

export default class extends Event {
	public async run(error: Error | UserError, context: CommandDeniedPayload) {
		const embed = createErrorEmbed(error.message);
		const isUserError = error instanceof UserError;

		if (!isUserError) {
			embed
				.setTitle(`An unexpected error occurred!`)
				.setDescription(`Please report this message to my owner, Vladdy#0002`)
				.addField('Error Stack', error.stack);
		}

		await context.message.channel.send(embed);

		if (!isUserError) this.context.client.logger.error(error.stack ?? (error.message || error));
	}
}
