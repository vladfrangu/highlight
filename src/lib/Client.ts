import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { PrismaClient } from '@prisma/client';
import { SapphireClient, Store } from '@sapphire/framework';
import { bold, cyanBright, green } from 'colorette';
import type { ClientOptions, Message } from 'discord.js';
import { ScheduleManager } from './schedule/ScheduleManager';
import { Task } from './schedule/tasks/Task';
import { HighlightManager } from './structures/HighlightManager';

export class Client extends SapphireClient {
	public schedule = new ScheduleManager(this);
	public prisma!: PrismaClient;
	public highlightManager = new HighlightManager(this);

	private readonly sqlHighlighter = new SqlHighlighter();

	public constructor(options?: ClientOptions) {
		super(options);
		this.stores //
			.register(new Store(Task as any, { name: 'tasks' }))
			.registerUserDirectories();
	}

	public fetchPrefix = async (message: Message) => {
		// If the message is in a DM, return default prefix
		if (!message.guild) return 'h.';

		// Fetch guild settings
		const result = await this.prisma.guildSettings.findFirst({ where: { guildID: message.guild.id } });

		// Return the custom guild prefix, or the default one if not present
		return result?.prefix ?? 'h.';
	};

	public fetchLanguage = () => 'en-US';

	public async login(token?: string) {
		const prisma = new PrismaClient({
			errorFormat: 'pretty',
			log: [
				{ emit: 'stdout', level: 'warn' },
				{ emit: 'stdout', level: 'error' },
				{ emit: 'event', level: 'query' },
			],
		});

		this.prisma = prisma;

		prisma.$on('query', (event) => {
			try {
				const paramsArray: unknown[] = event.params.slice(1, -1).split(',');

				const newQuery = event.query.replace(/\$(\d+)/g, (_, number) => {
					const value = paramsArray[Number(number) - 1];

					const tryNumber = Number(value);

					if (Number.isNaN(tryNumber) || value !== String(tryNumber)) {
						const stringified = String(value);
						if (stringified.startsWith('"')) return stringified;
						return `"${stringified}"`;
					}

					return String(tryNumber);
				});

				this.logger.debug(`${cyanBright('prisma:query')} ${this.sqlHighlighter.highlight(newQuery)}`);
			} catch {
				this.logger.debug(
					`${cyanBright('prisma:query')} ${this.sqlHighlighter.highlight(`${event.query} PARAMETERS ${event.params}`)}`,
				);
			}
		});

		prisma.$use(async (params, next) => {
			const before = Date.now();

			const result = await next(params);

			const after = Date.now();

			this.logger.debug(
				`${cyanBright('prisma:query')} ${bold(`${params.model}.${params.action}`)} took ${bold(
					`${green(String(after - before))}ms`,
				)}`,
			);

			return result;
		});

		await prisma.$connect();

		this.logger.info('Logging in to Discord...');
		return super.login(token);
	}

	public destroy() {
		void this.prisma.$disconnect();
		void this.highlightManager.destroy();
		return super.destroy();
	}
}

declare module 'discord.js' {
	export interface Client {
		schedule: ScheduleManager;
		prisma: PrismaClient;
		highlightManager: HighlightManager;
	}
}

declare module '@sapphire/framework' {
	export interface StoreRegistryEntries {
		tasks: Store<Task>;
	}
}
