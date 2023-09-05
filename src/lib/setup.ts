// #region Sapphire config
import { ApplicationCommandRegistries, container, LogLevel, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
// #endregion

// #region Env Setup
import { setup, type ArrayString, type NumberString } from '@skyra/env-utilities';

setup({ path: new URL('.env', rootDir) });

declare module '@skyra/env-utilities' {
	interface Env {
		SUPPORT_SERVER_INVITE: string;
		DEVELOPMENT_GUILD_IDS: ArrayString;
		ERROR_WEBHOOK_URL: string;
		GUILD_JOIN_LEAVE_WEBHOOK_URL: string;
		POSTGRES_HOST: string;
		POSTGRES_PORT: NumberString;
		POSTGRES_DB: string;
		POSTGRES_USERNAME: string;
		POSTGRES_PASSWORD: string;
		DISCORD_TOKEN: string;
		POSTGRES_URL: string;
	}
}
// #endregion

// #region NodeJS inspect settings
import { inspect } from 'node:util';
inspect.defaultOptions.depth = 4;
// #endregion

// #region Global color utility
import { createColors, type Colorette } from 'colorette';
container.colors = createColors({ useColor: true });

declare module '@sapphire/pieces' {
	interface Container {
		colors: Colorette;
	}
}
// #endregion

// #region Prisma
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import Prisma, { PrismaClient } from '@prisma/client';

const highlighter = new SqlHighlighter();

const prisma = new Prisma.PrismaClient({
	errorFormat: 'pretty',
	log: [
		{ emit: 'stdout', level: 'warn' },
		{ emit: 'stdout', level: 'error' },
	],
}).$extends({
	name: 'performance_tracking',
	query: {
		async $allOperations({ args, operation, query, model }) {
			// If we're not in debug mode, just run the query and return
			if (!container.logger.has(LogLevel.Debug)) {
				return query(args);
			}

			const start = performance.now();
			const result = await query(args);
			const end = performance.now();
			const time = end - start;

			if (model) {
				const stringifiedArgs = JSON.stringify(args, null, 2)
					.split('\n')
					.map((line) => container.colors.gray(line))
					.join('\n');

				container.logger.debug(
					`${container.colors.cyanBright('prisma:query')} ${container.colors.bold(
						`${model}.${operation}(${stringifiedArgs}${container.colors.bold(')')}`,
					)} took ${container.colors.bold(`${container.colors.green(time.toFixed(4))}ms`)}`,
				);
			} else {
				// Most likely in $executeRaw/queryRaw
				const casted = args as { values?: unknown[]; strings?: string[] } | undefined;

				const consoleMessage = [
					`${container.colors.cyanBright('prisma:query')} `,
					container.colors.bold(`Prisma.${operation}(\``),
				];

				const sqlString = [];

				if (casted?.strings) {
					if (casted.values) {
						for (const str of casted.strings) {
							sqlString.push(str);

							const value = casted.values.shift();
							if (value) {
								sqlString.push(JSON.stringify(value));
							}
						}
					} else {
						// just add all the strings
						sqlString.push(...casted.strings);
					}

					consoleMessage.push(highlighter.highlight(sqlString.join('')));
				} else if (Array.isArray(args)) {
					// Most likely in $executeRawUnsafe/queryRawUnsafe
					const sqlString = args.shift() as string | undefined;

					if (sqlString) {
						if (args.length) {
							for (let i = 1; i < args.length; i++) {
								sqlString.replace(`$${i}`, JSON.stringify(args[i]));
							}

							consoleMessage.push(highlighter.highlight(sqlString));
						} else {
							consoleMessage.push(highlighter.highlight(sqlString));
						}
					} else {
						consoleMessage.push(container.colors.gray(JSON.stringify(args)));
					}
				} else {
					// Who tf knows brother
					consoleMessage.push(container.colors.gray(JSON.stringify(args)));
				}

				consoleMessage.push(
					container.colors.bold('`) '),
					`took ${container.colors.bold(`${container.colors.green(time.toFixed(4))}ms`)}`,
				);

				container.logger.debug(consoleMessage.join(''));
			}

			return result;
		},
	},
}) as PrismaClient<{ errorFormat: 'pretty' }>;

container.prisma = prisma;

declare module '@sapphire/pieces' {
	interface Container {
		prisma: typeof prisma;
	}
}
// #endregion

// #region Highlight manager
import { HighlightManager } from '#structures/HighlightManager';
import { rootDir } from '#utils/misc';

container.highlightManager = new HighlightManager();

declare module '@sapphire/pieces' {
	interface Container {
		highlightManager: HighlightManager;
	}
}
// #endregion
