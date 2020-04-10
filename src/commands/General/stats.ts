import { version } from 'discord.js';
import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { loadavg, uptime } from 'os';

@ApplyOptions<CommandOptions>({
	aliases: ['stats'],
	description: 'Shows you some stats about the bot',
})
export default class extends Command {
	async run(message: KlasaMessage) {
		return message.sendLocale('COMMAND_STATS', [this._generalStatistics, this._uptimeStatistics, this._usageStatistics]);
	}

	private get _generalStatistics(): StatsGeneral {
		return {
			CHANNELS: this.client.channels.size.toLocaleString(),
			GUILDS: this.client.guilds.size.toLocaleString(),
			NODE_JS: process.version,
			USERS: this.client.guilds.reduce((a, b) => a + b.memberCount, 0).toLocaleString(),
			VERSION: `v${version}`,
		};
	}

	private get _uptimeStatistics(): StatsUptime {
		return {
			CLIENT: this.client.uptime!,
			HOST: uptime() * 1000,
			TOTAL: process.uptime() * 1000,
		};
	}

	private get _usageStatistics(): StatsUsage {
		const usage = process.memoryUsage();
		return {
			CPU_LOAD: loadavg().map((load) => Math.round(load * 10000) / 100) as [number, number, number],
			RAM_TOTAL: `${Math.round(100 * (usage.heapTotal / 1048576)) / 100}MB`,
			RAM_USED: `${Math.round(100 * (usage.heapUsed / 1048576)) / 100}MB`,
		};
	}
}

export interface StatsGeneral {
	CHANNELS: string;
	GUILDS: string;
	NODE_JS: string;
	USERS: string;
	VERSION: string;
}

export interface StatsUptime {
	CLIENT: number;
	HOST: number;
	TOTAL: number;
}

export interface StatsUsage {
	CPU_LOAD: [number, number, number];
	RAM_TOTAL: string;
	RAM_USED: string;
}
