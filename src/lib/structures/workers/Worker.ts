import MessageHandler from './internal/MessageHandler';
import { DeleteInvalidMessage, ReadyMessage, ValidatedMessage, WorkerData } from './SharedTypes';
import { parentPort, workerData } from 'worker_threads';

const typedWorkerData = workerData as WorkerData;

const sendToMaster = (message: DeleteInvalidMessage | ReadyMessage | ValidatedMessage) => parentPort!.postMessage(message);

const handler = new MessageHandler(typedWorkerData.botToken);

sendToMaster({ event: 'ready' });

parentPort!.on('message', (message: DeleteInvalidMessage | ReadyMessage | ValidatedMessage) => {
	console.log(handler.botToken);
	console.log(message);
});
