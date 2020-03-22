import { Worker } from 'worker_threads';
import { join } from 'path';
import { Highlight } from '../structures/Highlight';
import { WorkerTypes, ReceivedWorkerPayload, SentWorkerPayload } from '../types/Workers';
import { normalizeType, guildTypeToWorkerType } from '../utils/Util';
import type { GuildWorkerType, HighlightResult } from '../types/Misc';
import { KlasaMessage } from 'klasa';

const WORKER_PATH = join(__dirname, 'Worker.js');

export class Workers {
	wordWorker!: Worker;
	regexWorker!: Worker;

	destroyed = false;

	private _promiseMap = new Map<string, {
		promise: Promise<HighlightResult[]>;
		resolve: (data: HighlightResult[]) => void;
		results: HighlightResult[];
	}>();

	constructor(public client: Highlight) {
		this._spawnWorker(WorkerTypes.Word);
		this._spawnWorker(WorkerTypes.Regex);
	}

	async destroy() {
		this.destroyed = true;
		await this.wordWorker.terminate();
		await this.regexWorker.terminate();
	}

	validateRegex(input: string) {
		return new Promise<boolean>((resolve, reject) => {
			const listener = (data: ReceivedWorkerPayload) => {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				timeout.refresh();

				if (data.event === 'validateResult') {
					if (data.data.input === input) {
						this.regexWorker.off('message', listener);
						resolve(data.data.valid);
					}
				}
			};

			const timeout = setTimeout(() => {
				this.regexWorker.off('message', listener);
				reject('Timed out after 30s');
			}, 30000);

			this.regexWorker.on('message', listener);
			this._sendMessage(WorkerTypes.Regex, {
				event: 'validateRegex',
				data: {
					regex: input,
				},
			});
		});
	}

	update(type: GuildWorkerType, guildID: string, entries: Map<string, Set<string>>) {
		const parsedWorkerType = guildTypeToWorkerType(type);
		this._sendMessage(parsedWorkerType, {
			event: 'updateCache',
			data: {
				guildID,
				entries,
			},
		});
	}

	parseHighlight(message: KlasaMessage) {
		let resolve: (data: HighlightResult[]) => void;
		const promise = new Promise<HighlightResult[]>((pResolve) => {
			resolve = pResolve;
		});

		const promiseObject = { promise, resolve: resolve!, results: [] };

		this._promiseMap.set(message.id, promiseObject);

		this._sendMessage(WorkerTypes.Regex, {
			event: 'handleHighlight',
			data: {
				authorID: message.author.id,
				content: message.content,
				guildID: message.guild!.id,
				messageID: message.id,
				type: 'regularExpressions',
			},
		});

		this._sendMessage(WorkerTypes.Word, {
			event: 'handleHighlight',
			data: {
				authorID: message.author.id,
				content: message.content,
				guildID: message.guild!.id,
				messageID: message.id,
				type: 'words',
			},
		});

		return promise;
	}

	private _spawnWorker(type: WorkerTypes) {
		if (this.destroyed) return;
		const worker = this[type] = new Worker(WORKER_PATH, { workerData: { type } });
		worker.once('exit', (exitCode) => {
			this.client.console.log(`[${normalizeType(type)}] :: Exited with code ${exitCode} :: Respawning...`);
			worker.removeAllListeners();
			this._spawnWorker(type);
		});
		worker.on('message', (data: ReceivedWorkerPayload) => this._onPayload(type, data));
	}

	private _onPayload(type: WorkerTypes, data: ReceivedWorkerPayload) {
		const normalized = normalizeType(type);
		switch (data.event) {
			case 'ready': {
				this.client.console.log(`[${normalized}] :: READY`);
				return null;
			}
			case 'deleteInvalidRegex': {
				const { guildID, memberID, value } = data.data;
				this._deleteInvalidRegex(guildID, memberID, value).catch((err) => {
					this.client.emit('wtf', `Failed removing invalid regex from member ${memberID} in ${guildID}`, err);
				});
				return null;
			}
			case 'highlightResult': {
				const { messageID, result } = data.data;
				const promiseData = this._promiseMap.get(messageID);
				if (!promiseData) {
					this.client.emit('wtf', `Parsed highlight for message ${messageID} with type ${result.type} without having a promise`);
					return null;
				}

				const { type: workerType } = result;
				if (workerType === 'regularExpressions') promiseData.results[0] = result;
				else promiseData.results[1] = result;

				if (typeof promiseData.results[0] !== 'undefined' && typeof promiseData.results[1] !== 'undefined') {
					promiseData.resolve(promiseData.results);
					this._promiseMap.delete(messageID);
				}
				return null;
			}
			default: return null;
		}
	}

	private async _deleteInvalidRegex(guildID: string, memberID: string, regex: string) {
		/*
		 * Get guild member
		 * Alert them that their regex is invalid
		 */
		console.log('Delete', guildID, memberID, regex);
	}

	private _sendMessage(type: WorkerTypes, message: SentWorkerPayload) {
		return this[type].postMessage(message);
	}
}
