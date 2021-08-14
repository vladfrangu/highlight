import { cyan } from 'colorette';
import type { Message } from 'discord.js';
import { join } from 'path';
import { Worker } from 'worker_threads';
import type { Client } from '../Client';
import {
	DeleteInvalidRegularExpressionResponse,
	HighlightResult,
	WorkerCommands,
	WorkerCommandsUnion,
	WorkerResponse,
	WorkerResponseTypes,
} from '../types/WorkerTypes';

const WORKER_PATH = join(__dirname, 'Worker.js');

export enum WorkerType {
	Word,
	RegularExpression,
}

type ResultsTuple = [words: HighlightResult, regularExpressions: HighlightResult];

export class HighlightManager {
	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	#promiseMap = new Map<
		string,
		{
			promise: Promise<ResultsTuple>;
			resolve: (data: ResultsTuple) => void;
			results: ResultsTuple;
		}
	>();

	/**
	 * A tuple of the two workers that must be kept alive
	 */
	private workers: [words: Worker, regularExpressions: Worker] = [] as any;

	/**
	 * If the client was destroyed
	 */
	private destroyed = false;

	public constructor(public client: Client) {}

	public async init() {
		this.initializeWorkers();
		await this.updateAllCaches();
	}

	public async destroy() {
		this.destroyed = true;
		await Promise.all(this.workers.map((item) => item.terminate()));
	}

	public async updateAllCaches() {
		const members = await this.client.prisma.members.findMany();
		this.broadcastCommand({
			command: WorkerCommands.UpdateFullCache,
			data: { members },
		});
	}

	public async updateCacheForGuildID(guildID: string) {
		const members = await this.client.prisma.members.findMany({ where: { guildID } });
		this.broadcastCommand({
			command: WorkerCommands.UpdateCacheForGuild,
			data: {
				guildID,
				members,
			},
		});
	}

	public validateRegularExpression(input: string) {
		const worker = this.workers[WorkerType.RegularExpression];

		return new Promise<boolean>((resolve, reject) => {
			const listener = (payload: WorkerResponse) => {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				timeout.refresh();

				if (payload.command === WorkerResponseTypes.ValidateRegularExpressionResult) {
					if (payload.data.input === input) {
						worker.off('message', listener);
						resolve(payload.data.valid);
					}
				}
			};

			const timeout = setTimeout(() => {
				worker.off('message', listener);
				// eslint-disable-next-line prefer-promise-reject-errors
				reject('Timed out after 30s');
			}, 30000);

			worker.on('message', listener);
			worker.postMessage({
				command: WorkerCommands.ValidateRegularExpression,
				data: { regularExpression: input },
			} as WorkerCommandsUnion);
		});
	}

	public parseHighlight(message: Message) {
		let resolve: (data: ResultsTuple) => void;
		const promise = new Promise<ResultsTuple>((pResolve) => {
			resolve = pResolve;
		});

		const promiseObject = { promise, resolve: resolve!, results: [] as any };

		this.#promiseMap.set(message.id, promiseObject);

		this.broadcastCommand({
			command: WorkerCommands.HandleHighlight,
			data: {
				authorID: message.author.id,
				content: message.content,
				guildID: message.guild!.id,
				messageID: message.id,
			},
		});

		return promise;
	}

	public removeTriggerForUser(guildID: string, memberID: string, trigger: string) {
		this.broadcastCommand({
			command: WorkerCommands.RemoveTriggerForUser,
			data: {
				guildID,
				memberID,
				trigger,
			},
		});
	}

	private initializeWorkers() {
		this.createWorkerType(WorkerType.Word);
		this.createWorkerType(WorkerType.RegularExpression);
	}

	private createWorkerType(type: WorkerType) {
		// If the client was destroyed, stop early
		if (this.destroyed) return;

		// eslint-disable-next-line no-multi-assign
		const worker = (this.workers[type] = new Worker(WORKER_PATH, { workerData: { type } }));
		worker.once('exit', (exitCode) => {
			this.client.logger.info(
				`[${cyan(WorkerType[type])}] Exited with code ${exitCode}${this.destroyed ? '' : ' :: Respawning'}`,
			);
			worker.removeAllListeners();
			this.createWorkerType(type);
		});
		worker.on('message', (data: WorkerResponse) => this.onWorkerResponse(type, data));
	}

	/**
	 * Sends a command to the workers
	 * @param command The data to send
	 */
	private broadcastCommand(command: WorkerCommandsUnion) {
		this.workers.forEach((worker) => worker.postMessage(command));
	}

	private onWorkerResponse(type: WorkerType, payload: WorkerResponse) {
		const colored = cyan(WorkerType[type]);

		switch (payload.command) {
			case WorkerResponseTypes.DeleteInvalidRegularExpression: {
				void this.deleteInvalidRegularExpression(payload.data);
				break;
			}
			case WorkerResponseTypes.HighlightResult: {
				const { messageID, result } = payload.data;
				const promiseData = this.#promiseMap.get(messageID);

				if (!promiseData) {
					this.client.logger.warn(
						`Parsed highlight for message "${messageID}", but there was no promise in the promise map`,
					);
					return;
				}

				const { type } = result;
				promiseData.results[type] = result;

				if (typeof promiseData.results[0] !== 'undefined' && typeof promiseData.results[1] !== 'undefined') {
					promiseData.resolve(promiseData.results);
					this.#promiseMap.delete(messageID);
				}

				break;
			}
			case WorkerResponseTypes.Ready: {
				this.client.logger.info(`[${colored}] :: READY`);
				break;
			}
		}
	}

	private async deleteInvalidRegularExpression(_data: DeleteInvalidRegularExpressionResponse['data']) {
		// TODO: delete regular expression and warn user in DMs
		// For real this time LMAO
	}
}
