import { envParseArray } from '@skyra/env-utilities';

let parsedGuildIds: string[] = null!;

export function useDevelopmentGuildIds() {
	parsedGuildIds ??= envParseArray('DEVELOPMENT_GUILD_IDS', []).filter((item) => Boolean(item));

	return parsedGuildIds;
}
