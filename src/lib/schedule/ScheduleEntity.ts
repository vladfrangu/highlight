import type { Schedules } from '@prisma/client';
import { Cron } from '@sapphire/time-utilities';
import type { Client } from 'discord.js';
import type { ScheduleManager } from './ScheduleManager';

export const enum ResponseType {
	Ignore,
	Delay,
	Update,
	Finished,
}

export type PartialResponseValue =
	| { type: ResponseType.Ignore | ResponseType.Finished }
	| { type: ResponseType.Delay; value: number }
	| { type: ResponseType.Update; value: Date };

export type ResponseValue = PartialResponseValue & { entry: ScheduleEntity };

export class ScheduleEntity {
	/**
	 * The id for this scheduled task
	 */
	public id: number;

	/**
	 * The name of the Task this scheduled task will run
	 */
	public taskID: string;

	/**
	 * The Date when this scheduled task ends
	 */
	public time: Date;

	/**
	 * Whether this scheduled task is scheduled with the Cron pattern
	 */
	public recurring: Cron | null = null;

	/**
	 * The stored metadata to send to the Task
	 */
	public data: Record<string, unknown> | null;

	/**
	 * Whether or not the entity is running
	 */
	private running = false;

	/**
	 * Whether or not the entity is paused
	 */
	private paused = true;

	private client: Client = null!;
	private manager: ScheduleManager = null!;

	public constructor(data: Schedules) {
		this.id = data.id;
		this.taskID = data.taskID;
		this.time = data.time;
		this.recurring = data.recurring ? new Cron(data.recurring) : null;
		this.data = data.data as any;
	}

	public setup(manager: ScheduleManager) {
		this.client = manager.client;
		this.manager = manager;
		return this;
	}

	public get task() {
		return this.client.stores.get('tasks').get(this.taskID) ?? null;
	}

	public async run(): Promise<ResponseValue> {
		const { task } = this;
		if (!task?.enabled || this.running || this.paused) return { entry: this, type: ResponseType.Ignore };

		this.running = true;
		let response: PartialResponseValue | null = null;
		try {
			response = (await task.run({ ...(this.data ?? {}), id: this.id })) as PartialResponseValue | null;
		} catch (error) {
			this.client.emit('taskError', this, task, error);
		}

		this.running = false;

		if (response !== null) return { ...response, entry: this };

		return this.recurring
			? { entry: this, type: ResponseType.Update, value: this.recurring.next() }
			: { entry: this, type: ResponseType.Finished };
	}

	public resume() {
		this.paused = false;
		return this;
	}

	public pause() {
		this.paused = true;
		return this;
	}

	public delete() {
		return this.manager.remove(this);
	}
}
