// Sapphire config
import { ApplicationCommandRegistries, container, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';

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

// #region Application Commands

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
// #endregion

// #region NodeJS inspect settings
import { inspect } from 'node:util';
inspect.defaultOptions.depth = 2;
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
import Prisma from '@prisma/client';

container.prisma = new Prisma.PrismaClient({
	errorFormat: 'pretty',
	log: [
		{ emit: 'stdout', level: 'warn' },
		{ emit: 'stdout', level: 'error' },
		{ emit: 'event', level: 'query' },
	],
});

const sqlHighlighter = new SqlHighlighter();

container.prisma.$on('query', (event) => {
	try {
		const paramsArray = JSON.parse(event.params) as unknown[];
		const newQuery = event.query.replace(/\$(\d+)/g, (_, number) => {
			const value = paramsArray[Number(number) - 1];

			if (typeof value === 'string') {
				return `"${value}"`;
			}

			if (Array.isArray(value)) {
				return `'${JSON.stringify(value)}'`;
			}

			return String(value);
		});

		container.logger.debug(`${container.colors.cyanBright('prisma:query')} ${sqlHighlighter.highlight(newQuery)}`);
	} catch {
		container.logger.debug(
			`${container.colors.cyanBright('prisma:query')} ${sqlHighlighter.highlight(
				`${event.query} PARAMETERS ${event.params}`,
			)}`,
		);
	}
});

container.prisma.$use(async (params, next) => {
	const before = Date.now();

	const result = await next(params);

	const after = Date.now();

	container.logger.debug(
		`${container.colors.cyanBright('prisma:query')} ${container.colors.bold(
			`${params.model}.${params.action}`,
		)} took ${container.colors.bold(`${container.colors.green(String(after - before))}ms`)}`,
	);

	return result;
});

declare module '@sapphire/pieces' {
	interface Container {
		prisma: Prisma.PrismaClient<{
			errorFormat: 'pretty';
			log: (
				| {
						emit: 'stdout';
						level: 'warn';
				  }
				| {
						emit: 'stdout';
						level: 'error';
				  }
				| {
						emit: 'event';
						level: 'query';
				  }
			)[];
		}>;
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
