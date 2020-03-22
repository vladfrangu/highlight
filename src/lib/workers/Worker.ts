import { isMainThread, parentPort, MessagePort } from 'worker_threads';
import type { ReceivedWorkerPayload, SentWorkerPayload } from '../types/Workers';
import { WorkerCache } from '../structures/WorkerCache';

const CACHE = new WorkerCache();

function checkParentPort(port: unknown): asserts port is MessagePort {
	if (isMainThread || port === null) throw new Error('The Worker may only be ran via the worker_threads fork method!');
}

checkParentPort(parentPort);

function sendToMaster(message: ReceivedWorkerPayload) {
	return parentPort!.postMessage(message);
}

sendToMaster({ event: 'ready' });

setInterval(() => {
	parentPort!.postMessage({ event: 'heartbeat' });
}, 45000);

parentPort.on('message', (message: SentWorkerPayload) => {
	switch (message.event) {
		case 'validateRegex': {
			const valid = CACHE.isRegexValid(message.data.regex);
			sendToMaster({ event: 'validateResult', data: { input: message.data.regex, valid } });
			break;
		}
		case 'updateCache': {
			const { entries, guildID } = message.data;
			CACHE.updateGuild(guildID, entries);
			break;
		}
		case 'handleHighlight': {
			const { authorID, content, guildID, messageID, type } = message.data;
			const result = CACHE.parse(type, guildID, authorID, content);
			sendToMaster({ event: 'highlightResult', data: { messageID, result } });
			break;
		}
		default:
	}
});
