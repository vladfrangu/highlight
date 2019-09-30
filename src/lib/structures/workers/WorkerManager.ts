import { ReceivedMessage, ValidatedMessage, WorkerType } from './SharedTypes';
import { KlasaClient } from 'klasa';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { GuildWorkerType } from '../../Extender';

const WORKER_PATH = join(__dirname, 'Worker.js');

const normalizeType = (type: WorkerType) => type === 'wordWorker' ? 'Word Worker' : 'Regular Expression Worker';
const normalizeGuildType = (type: GuildWorkerType): WorkerType => type === 'words' ? 'wordWorker' : 'regularExpressionWorker';

export default class WorkerManager {
	client: KlasaClient;
	wordWorker: Worker;
	regularExpressionWorker: Worker;

	constructor(client: KlasaClient) {
		this.client = client;

		this.wordWorker = new Worker(WORKER_PATH, { workerData: { type: 'wordWorker', botToken: client.token } });

		this.regularExpressionWorker = new Worker(WORKER_PATH, { workerData: { type: 'regularExpressionWorker', botToken: client.token } });

		this._attachEventListeners(this.wordWorker, 'wordWorker');
		this._attachEventListeners(this.regularExpressionWorker, 'regularExpressionWorker');
	}

	validateRegex(regex: string) {
		return new Promise<boolean>((resolve, reject) => {
			const listener = (message: ReceivedMessage) => {
				if (message.event === 'validationResult') {
					if ((message as ValidatedMessage).data.input === regex) {
						resolve(message.data.valid);
						this.regularExpressionWorker.off('message', listener);
					}
				}
			};

			this.regularExpressionWorker.on('message', listener);
			setTimeout(() => {
				this.regularExpressionWorker.off('message', listener);
				reject("Couldn't validate in 30s");
			}, 30000);
		});
	}

	update(type: GuildWorkerType, guildID: string, newValue: Map<string, Set<string>>) {
		const normalized = normalizeGuildType(type);
		console.log(normalized, guildID, newValue);
	}

	private _attachEventListeners(worker: Worker, type: WorkerType) {
		worker.once('exit', (exitCode) => {
			this.client.emit('log', `[${normalizeType(type)}] :: Exited with code [${exitCode}] => Respawning...`);
			worker.removeAllListeners('message');
			this[type] = new Worker(WORKER_PATH, { workerData: { type, botToken: this.client.token } });
			this._attachEventListeners(this[type], type);
		});
		worker.on('message', this._onMessage.bind(this, type));
	}

	private _onMessage(type: WorkerType, message: ReceivedMessage) {
		const normalized = normalizeType(type);
		switch (message.event) {
			case 'deleteInvalid': {
				// TODO: get guild, fetch member, tell them that a regex was invalid and removed from their user
				break;
			}
			case 'ready': {
				this.client.emit('log', `[${normalized}] :: READY`);
				break;
			}
			default:
		}
	}
}
