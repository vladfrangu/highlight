let parsedGuildIds: string[] = null!;

export function useDevelopmentGuildIds() {
	parsedGuildIds ??= (process.env.DEVELOPMENT_GUILD_IDS?.split(',') ?? []).filter((item) => Boolean(item));

	return parsedGuildIds;
}
