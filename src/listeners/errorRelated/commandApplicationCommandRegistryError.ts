import { Command, Events, Listener } from '@sapphire/framework';

export class CoreEvent extends Listener<typeof Events.CommandApplicationCommandRegistryError> {
	public override run(error: unknown, command: Command) {
		const { name, location } = command;
		this.container.logger.error(
			`Encountered error while handling the command application command registry for command "${name}" at path "${location.full}"`,
			error,
		);
	}
}
