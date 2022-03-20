import { Events, Listener, ListenerErrorPayload } from '@sapphire/framework';

export class CoreEvent extends Listener<typeof Events.ListenerError> {
	public override run(error: unknown, context: ListenerErrorPayload) {
		const { name, event, location } = context.piece;
		this.container.logger.error(
			`Encountered error on event listener "${name}" for event "${String(event)}" at path "${location.full}"`,
			error,
		);
	}
}
