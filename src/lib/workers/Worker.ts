import { setInterval } from 'node:timers';
import { parentPort, workerData } from 'node:worker_threads';
import type { Member } from '@prisma/client';
import { WorkerCommands, WorkerResponseTypes, WorkerType, type WorkerCommandsUnion } from '#types/WorkerTypes';
import { RegularExpressionWordMarker } from '#utils/misc';
import { WorkerCache, type GuildId, type UserId } from '#workers/WorkerCache';
import { checkParentPort, sendToMainProcess } from '#workers/common';

const CACHE = new WorkerCache();

checkParentPort(parentPort);
sendToMainProcess({ command: WorkerResponseTypes.Ready, data: { ready: true } });

// Create keep-alive interval
setInterval(() => {
	sendToMainProcess({ command: 69_420 } as any);
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
				for (const wordOrPattern of member.regularExpressions) {
					if (
						workerData.type === WorkerType.RegularExpression &&
						wordOrPattern.includes(RegularExpressionWordMarker)
					) {
						continue;
					}

					if (workerData.type === WorkerType.Word && !wordOrPattern.includes(RegularExpressionWordMarker)) {
						continue;
					}

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
		for (const option of member.regularExpressions) {
			if (workerData.type === WorkerType.Word && !option.includes(RegularExpressionWordMarker)) {
				continue;
			}

			if (workerData.type === WorkerType.RegularExpression && option.includes(RegularExpressionWordMarker)) {
				continue;
			}

			const cachedInstance = cacheToUpdate.get(option) ?? new Set();
			cachedInstance.add(member.userId);
			cacheToUpdate.set(option, cachedInstance);
		}
	}

	return cacheToUpdate;
}
