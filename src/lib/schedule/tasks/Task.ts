import { Piece } from '@sapphire/framework';
import type { Awaited } from '@sapphire/utilities';
import type { PartialResponseValue } from '../ScheduleEntity';

export abstract class Task extends Piece {
	/**
	 * The run method to be overwritten in actual Task pieces
	 * @param data The data
	 */
	public abstract run(data?: unknown): Awaited<PartialResponseValue | null>;
}
