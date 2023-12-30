import process from 'node:process';
import { isMainThread, parentPort } from 'node:worker_threads';
import type { MessagePort } from 'node:worker_threads';
import type { WorkerResponse } from '#types/WorkerTypes';

export function checkParentPort(port: unknown): asserts port is MessagePort {
	if (isMainThread) throw new Error('The worker may only be ran via the `worker_threads` module');
	// If the port is null, we probably lost connection to the main process
	if (port === null) return process.exit(-1);
}

export function sendToMainProcess(response: WorkerResponse) {
	checkParentPort(parentPort);
	parentPort.postMessage(response);
}
