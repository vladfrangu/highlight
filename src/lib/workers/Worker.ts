import { WorkerCommands, WorkerCommandsUnion, WorkerResponseTypes, WorkerType } from '#types/WorkerTypes';
import { checkParentPort, sendToMainProcess } from '#workers/common';
import { GuildId, UserId, WorkerCache } from '#workers/WorkerCache';
import type { Member } from '@prisma/client';
import { parentPort, workerData } from 'worker_threads';

const CACHE = new WorkerCache();
const MEMBER_TYPE_KEY = workerData.type === WorkerType.Word ? 'words' : 'regularExpressions';

checkParentPort(parentPort);
sendToMainProcess({ command: WorkerResponseTypes.Ready, data: { ready: true } });

// Create keep-alive interval
setInterval(() => {
	sendToMainProcess({ command: 'heartbeat' } as any);
}, 45_000);

parentPort.on('message', (payload: WorkerCommandsUnion) => {
	switch (payload.command) {
		case WorkerCommands.HandleHighlight: {
			const { authorId, content, guildId, messageId } = payload.data;
			const result = CACHE.parse(workerData.type, guildId, authorId, content);
			sendToMainProcess({ command: WorkerResponseTypes.HighlightResult, data: { messageId, result } });
			break;
		}
		case WorkerCommands.UpdateCacheForGuild: {
			const res = new Map<string, Set<string>>();

			// Iterate through every member
			processMemberCacheUpdate(res, payload.data.members);

			CACHE.updateGuild(payload.data.guildId, res);
			break;
		}
		case WorkerCommands.UpdateFullCache: {
			const guildMap = new Map<GuildId, Map<string, Set<UserId>>>();

			for (const member of payload.data.members) {
				// Get cached guild data entry
				const guildData = guildMap.get(member.guildId) ?? new Map<string, Set<UserId>>();

				// Iterate over the current member's data
				for (const wordOrPattern of member[MEMBER_TYPE_KEY]) {
					const cachedWordOrPattern = guildData.get(wordOrPattern) ?? new Set<string>();
					cachedWordOrPattern.add(member.userId);
					if (cachedWordOrPattern.size) guildData.set(wordOrPattern, cachedWordOrPattern);
				}

				// Set the guild data in the map
				guildMap.set(member.guildId, guildData);
			}

			for (const [guildId, data] of guildMap.entries()) {
				if (data.size) CACHE.updateGuild(guildId, data);
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

function processMemberCacheUpdate(cacheToUpdate: Map<string, Set<string>>, members: Member[]) {
	for (const member of members) {
		for (const option of member[MEMBER_TYPE_KEY]) {
			const cachedInstance = cacheToUpdate.get(option) ?? new Set();
			cachedInstance.add(member.userId);
			cacheToUpdate.set(option, cachedInstance);
		}
	}

	return cacheToUpdate;
}
