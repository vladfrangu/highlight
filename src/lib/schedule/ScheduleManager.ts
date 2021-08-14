/* eslint-disable no-multi-assign */
import { Cron, TimerManager } from '@sapphire/time-utilities';
import type { Client } from '../Client';
import { ResponseType, ResponseValue, ScheduleEntity } from './ScheduleEntity';

export class ScheduleManager {
	public readonly client: Client;
	public queue: ScheduleEntity[] = [];

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#interval: NodeJS.Timer | null = null;

	public constructor(client: Client) {
		this.client = client;
	}

	public async init() {
		const entries = await this.client.prisma.schedules.findMany();

		for (const entry of entries) this.insertInQueue(new ScheduleEntity(entry).setup(this).resume());
		this.checkInterval();
	}

	public async add(taskID: string, timeResolvable: TimeResolvable, options: ScheduleManagerAddOptions = {}) {
		if (!this.client.stores.get('tasks').has(taskID)) throw new Error(`The task '${taskID}' does not exist.`);

		const [time, cron] = this.resolveTime(timeResolvable);

		const d = await this.client.prisma.schedules.create({
			data: {
				taskID,
				time,
				recurring: cron?.cron ?? null,
				data: (options.data ?? {}) as any,
			},
		});

		const entry = new ScheduleEntity(d);

		this.insertInQueue(entry.setup(this).resume());
		this.checkInterval();
		return entry;
	}

	public async remove(entityOrID: ScheduleEntity | number) {
		if (typeof entityOrID === 'number') {
			entityOrID = this.queue.find((entity) => entity.id === entityOrID)!;
			if (!entityOrID) return false;
		}

		entityOrID.pause();
		await this.client.prisma.schedules.delete({ where: { id: entityOrID.id } });

		this.removeFromQueue(entityOrID);
		this.checkInterval();
		return true;
	}

	public async execute() {
		if (this.queue.length) {
			// Process the active tasks, they're sorted by the time they end
			const now = Date.now();
			const execute = [];
			for (const entry of this.queue) {
				if (entry.time.getTime() > now) break;
				execute.push(entry.run());
			}

			// Check if the Schedule has a task to run and run them if they exist
			if (!execute.length) return;
			await this.handleResponses(await Promise.all(execute));
		}

		this.checkInterval();
	}

	private async handleResponses(responses: readonly ResponseValue[]) {
		const em = this.client.prisma.schedules;
		const updated: ScheduleEntity[] = [];
		const removed: ScheduleEntity[] = [];
		try {
			for (const response of responses) {
				// Pause so it is not re-run
				response.entry.pause();

				switch (response.type) {
					case ResponseType.Delay: {
						const time = (response.entry.time = new Date(response.entry.time.getTime() + response.value));
						updated.push(response.entry);
						await em.update({ where: { id: response.entry.id }, data: { time } });
						continue;
					}
					case ResponseType.Finished: {
						removed.push(response.entry);
						await em.delete({ where: { id: response.entry.id } });
						continue;
					}
					case ResponseType.Ignore: {
						continue;
					}
					case ResponseType.Update: {
						const time = (response.entry.time = response.value);
						updated.push(response.entry);
						await em.update({ where: { id: response.entry.id }, data: { time } });
					}
				}
			}

			// Update cache
			// - Remove expired entries
			for (const entry of removed) {
				this.removeFromQueue(entry);
			}

			// - Update indexes
			for (const entry of updated) {
				const index = this.queue.findIndex((entity) => entity === entry);
				if (index === -1) continue;

				this.queue.splice(index, 1);
				this.insertInQueue(entry);

				// Resume so it can be run again
				entry.resume();
			}
		} catch (error) {
			this.client.emit('wtf', error);
		}
	}

	private insertInQueue(entity: ScheduleEntity) {
		const index = this.queue.findIndex((entry) => entry.time > entity.time);
		if (index === -1) this.queue.push(entity);
		else this.queue.splice(index, 0, entity);

		return entity;
	}

	private removeFromQueue(entity: ScheduleEntity) {
		const index = this.queue.findIndex((entry) => entry === entity);
		if (index !== -1) this.queue.splice(index, 1);
	}

	/**
	 * Clear the current interval
	 */
	private clearInterval(): void {
		if (this.#interval) {
			TimerManager.clearInterval(this.#interval);
			this.#interval = null;
		}
	}

	/**
	 * Sets the interval when needed
	 */
	private checkInterval(): void {
		if (!this.queue.length) this.clearInterval();
		else if (!this.#interval) this.#interval = TimerManager.setInterval(this.execute.bind(this), 5000);
	}

	/**
	 * Resolve the time and cron
	 * @param time The time or Cron pattern
	 */
	private resolveTime(time: TimeResolvable): [Date, Cron | null] {
		if (time instanceof Date) return [time, null];
		if (time instanceof Cron) return [time.next(), time];
		if (typeof time === 'number') return [new Date(time), null];
		if (typeof time === 'string') {
			const cron = new Cron(time);
			return [cron.next(), cron];
		}
		throw new Error('invalid time passed');
	}
}

export interface ScheduleManagerAddOptions {
	/**
	 * The data to pass to the Task piece when the ScheduledTask is ready for execution.
	 */
	data?: Record<string, unknown>;
}

export type TimeResolvable = number | Date | string | Cron;
