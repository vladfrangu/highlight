import type { Members } from '@prisma/client';
import { isMainThread, MessagePort, parentPort, workerData } from 'worker_threads';
import { WorkerCommands, WorkerCommandsUnion, WorkerResponse, WorkerResponseTypes } from '../types/WorkerTypes';
import { WorkerType } from './HighlightManager';
import { WorkerCache } from './WorkerCache';

const CACHE = new WorkerCache();
const MEMBER_TYPE_KEY = workerData.type === WorkerType.Word ? 'words' : 'regularExpressions';

function processMemberCacheUpdate(cacheToUpdate: Map<string, Set<string>>, members: Members[]) {
	for (const member of members) {
		for (const option of member[MEMBER_TYPE_KEY]) {
			const cachedInstance = cacheToUpdate.get(option) ?? new Set();
			cachedInstance.add(member.userID);
			cacheToUpdate.set(option, cachedInstance);
		}
	}

	return cacheToUpdate;
}

function checkParentPort(port: unknown): asserts port is MessagePort {
	if (isMainThread) throw new Error('The worker may only be ran via the `worker_threads` module');
	// If the port is null, we probably lost connection to the main process
	if (port === null) return process.exit(-1);
}

checkParentPort(parentPort);

function sendToMainProcess(response: WorkerResponse) {
	checkParentPort(parentPort);
	parentPort.postMessage(response);
}

sendToMainProcess({ command: WorkerResponseTypes.Ready, data: { ready: true } });

// Create keep-alive interval
setInterval(() => {
	sendToMainProcess({ command: 'heartbeat' } as any);
}, 45_000);

parentPort.on('message', (payload: WorkerCommandsUnion) => {
	switch (payload.command) {
		case WorkerCommands.HandleHighlight: {
			const { authorID, content, guildID, messageID } = payload.data;
			const result = CACHE.parse(workerData.type, guildID, authorID, content);
			sendToMainProcess({ command: WorkerResponseTypes.HighlightResult, data: { messageID, result } });
			break;
		}
		case WorkerCommands.UpdateCacheForGuild: {
			const res = new Map<string, Set<string>>();

			// Iterate through every member
			processMemberCacheUpdate(res, payload.data.members);

			CACHE.updateGuild(payload.data.guildID, res);
			break;
		}
		case WorkerCommands.UpdateFullCache: {
			const guildMap = new Map<string, Map<string, Set<string>>>();

			for (const member of payload.data.members) {
				// Get cached guild data entry
				const guildData = guildMap.get(member.guildID) ?? new Map<string, Set<string>>();

				// Iterate over the current member's data
				for (const option of member[MEMBER_TYPE_KEY]) {
					const cachedInstance = guildData.get(option) ?? new Set<string>();
					cachedInstance.add(member.userID);
					if (cachedInstance.size) guildData.set(option, cachedInstance);
				}

				// Set the guild data in the map
				guildMap.set(member.guildID, guildData);
			}

			for (const [guildID, data] of guildMap.entries()) {
				if (data.size) CACHE.updateGuild(guildID, data);
			}

			break;
		}
		case WorkerCommands.ValidateRegularExpression: {
			const valid = CACHE.isRegularExpressionValid(payload.data.regularExpression);
			sendToMainProcess({
				command: WorkerResponseTypes.ValidateRegularExpressionResult,
				data: { input: payload.data.regularExpression, valid },
			});
			break;
		}
		case WorkerCommands.RemoveTriggerForUser: {
			CACHE.removeTriggerForUser(payload.data);
			break;
		}
	}
});
