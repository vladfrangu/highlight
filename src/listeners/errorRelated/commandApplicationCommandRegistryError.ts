import type { Command, Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';

export class CoreEvent extends Listener<typeof Events.CommandApplicationCommandRegistryError> {
	public override run(error: unknown, command: Command) {
		const { name, location } = command;
		this.container.logger.error(
			`Encountered error while handling the command application command registry for command`,
			{ commandName: name, filePath: location.full },
			error,
		);
	}
}
