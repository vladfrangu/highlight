import { Events, Listener, type ListenerErrorPayload } from '@sapphire/framework';

export class CoreEvent extends Listener<typeof Events.ListenerError> {
	public override run(error: unknown, context: ListenerErrorPayload) {
		const { name, event, location } = context.piece;
		this.container.logger.error(
			`Encountered error on event listener`,
			{ pieceName: name, event, filePath: location.full },
			error,
		);
	}
}
