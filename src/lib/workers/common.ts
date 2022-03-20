import type { WorkerResponse } from '#types/WorkerTypes';
import { isMainThread, MessagePort, parentPort } from 'worker_threads';

export function checkParentPort(port: unknown): asserts port is MessagePort {
	if (isMainThread) throw new Error('The worker may only be ran via the `worker_threads` module');
	// If the port is null, we probably lost connection to the main process
	if (port === null) return process.exit(-1);
}

export function sendToMainProcess(response: WorkerResponse) {
	checkParentPort(parentPort);
	parentPort.postMessage(response);
}
