import { setTimeout } from 'node:timers';
import { Worker } from 'node:worker_threads';
import { container } from '@sapphire/framework';
import { remove } from 'confusables';
import type { Message } from 'discord.js';
import {
	WorkerCommands,
	WorkerResponseTypes,
	WorkerType,
	type DeleteInvalidRegularExpressionResponse,
	type HighlightResult,
	type WorkerCommandsUnion,
	type WorkerResponse,
} from '#types/WorkerTypes';

const WORKER_PATH = new URL('../workers/Worker.js', import.meta.url);

type ResultsTuple = [words: HighlightResult, regularExpressions: HighlightResult];

export class HighlightManager {
	/**
	 * A tuple of the two workers that must be kept alive
	 */
	private workers: [words: Worker, regularExpressions: Worker] = [] as any;

	/**
	 * If the client was destroyed
	 */
	private destroyed = false;

	#promiseMap = new Map<
		string,
		{
			promise: Promise<ResultsTuple>;
			resolve(data: ResultsTuple): void;
			results: ResultsTuple;
		}
	>();

	public async start() {
		this.initializeWorkers();
		await this.updateAllCaches();
	}

	public async destroy() {
		this.destroyed = true;
		await Promise.all(this.workers.map(async (item) => item.terminate()));
	}

	public async updateAllCaches() {
		const members = await container.prisma.member.findMany();
		this.broadcastCommand({
			command: WorkerCommands.UpdateFullCache,
			data: { members },
		});
	}

	public async updateCacheForGuildID(guildId: string) {
		const members = await container.prisma.member.findMany({ where: { guildId } });
		this.broadcastCommand({
			command: WorkerCommands.UpdateCacheForGuild,
			data: {
				guildId,
				members,
			},
		});
	}

	public async validateRegularExpression(input: string) {
		const worker = this.workers[WorkerType.RegularExpression];

		return new Promise<boolean>((resolve, reject) => {
			const listener = (payload: WorkerResponse) => {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				timeout.refresh();

				if (
					payload.command === WorkerResponseTypes.ValidateRegularExpressionResult &&
					payload.data.input === input
				) {
					worker.off('message', listener);
					resolve(payload.data.valid);
				}
			};

			const timeout = setTimeout(() => {
				worker.off('message', listener);
				// eslint-disable-next-line prefer-promise-reject-errors
				reject('Timed out after 30s');
			}, 30_000);

			worker.on('message', listener);
			worker.postMessage({
				command: WorkerCommands.ValidateRegularExpression,
				data: { regularExpression: input },
			} as WorkerCommandsUnion);
		});
	}

	public async parseHighlight(message: Message) {
		let pResolve: (data: ResultsTuple) => void;
		const promise = new Promise<ResultsTuple>((resolve) => {
			pResolve = resolve;
		});

		const promiseObject = { promise, resolve: pResolve!, results: [] as any };

		this.#promiseMap.set(message.id, promiseObject);

		this.broadcastCommand({
			command: WorkerCommands.HandleHighlight,
			data: {
				authorId: message.author.id,
				content: remove(message.content),
				guildId: message.guild!.id,
				messageId: message.id,
			},
		});

		return promise;
	}

	public removeTriggerForUser(guildId: string, memberId: string, trigger: string) {
		this.broadcastCommand({
			command: WorkerCommands.RemoveTriggerForUser,
			data: {
				guildId,
				memberId,
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
		if (this.destroyed) {
			return;
		}

		// eslint-disable-next-line no-multi-assign
		const worker = (this.workers[type] = new Worker(WORKER_PATH, { workerData: { type } }));
		worker.once('exit', (exitCode) => {
			container.logger.info(
				`[${container.colors.cyan(`${WorkerType[type]} Worker`)}]: Exited with code ${exitCode}.${
					this.destroyed ? '' : ' Respawning...'
				}`,
			);

			// @ts-expect-error TS 5.5.2 shenanigans
			worker.removeAllListeners();
			this.createWorkerType(type);
		});
		worker.on('message', (data: WorkerResponse) => this.onWorkerResponse(type, data));
	}

	/**
	 * Sends a command to the workers
	 */
	private broadcastCommand(command: WorkerCommandsUnion) {
		for (const worker of this.workers) worker.postMessage(command);
	}

	private onWorkerResponse(type: WorkerType, payload: WorkerResponse) {
		const colored = container.colors.cyan(`${WorkerType[type]} Worker`);

		switch (payload.command) {
			case WorkerResponseTypes.DeleteInvalidRegularExpression: {
				void this.deleteInvalidRegularExpression(payload.data);
				break;
			}

			case WorkerResponseTypes.HighlightResult: {
				const { messageId, result } = payload.data;
				const promiseData = this.#promiseMap.get(messageId);

				if (!promiseData) {
					container.logger.warn(
						//
						`Parsed highlight for message, but there was no promise in the promise map`,
						{ messageId },
					);
					return;
				}

				const { type } = result;
				promiseData.results[type] = result;

				if (typeof promiseData.results[0] !== 'undefined' && typeof promiseData.results[1] !== 'undefined') {
					promiseData.resolve(promiseData.results);
					this.#promiseMap.delete(messageId);
				}

				break;
			}

			case WorkerResponseTypes.Ready: {
				container.logger.info(`[${colored}]: READY`);
				break;
			}

			case WorkerResponseTypes.ValidateRegularExpressionResult: {
				// Do a whole lot of nothing
				break;
			}
		}
	}

	private async deleteInvalidRegularExpression(data: DeleteInvalidRegularExpressionResponse['data']) {
		const memberData = await container.prisma.member.findFirst({
			where: { guildId: data.guildId, userId: data.memberId },
		});

		if (!memberData) {
			container.logger.warn(
				`Received invalid regular expression for member but no member data could be found`,
				data,
			);
			return;
		}

		const newRegularExpressions = memberData.regularExpressions.filter((regex) => regex !== data.value);
		await container.prisma.member.update({
			where: { guildId_userId: { guildId: data.guildId, userId: data.memberId } },
			data: { regularExpressions: newRegularExpressions },
		});

		// TODO: warn user in DMs
	}
}
