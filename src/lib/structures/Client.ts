import WorkerManager from './workers/WorkerManager';
import { cpus } from 'os';
import { Client, util as KlasaUtil } from 'klasa';
import { Client as MemberClient } from 'klasa-member-gateway';

const getCPUInfo = () => {
	const cpuInfo = cpus();

	let user = 0,
		nice = 0,
		sys = 0,
		idle = 0,
		irq = 0,
		total = 0;

	for (const cpu of cpuInfo) {
		user += cpu.times.user;
		nice += cpu.times.nice;
		sys += cpu.times.sys;
		irq += cpu.times.irq;
		idle += cpu.times.idle;
	}

	total = user + nice + sys + idle + irq;

	return { total, idle };
};

Client.use(MemberClient);

export default class HighlightClient extends Client {
	workerManager!: WorkerManager;

	async getCPUUsage() {
		const { idle: startIdle, total: startTotal } = getCPUInfo();
		await KlasaUtil.sleep(1000);
		const { idle: endIdle, total: endTotal } = getCPUInfo();
		return 1 - ((endIdle - startIdle) / (endTotal - startTotal));
	}

	async login(token: string) {
		await super.login(token);
		this.workerManager = new WorkerManager(this);
		return token;
	}
}

declare module 'discord.js' {
	interface Client {
		workerManager: WorkerManager;

		getCPUUsage(): Promise<number>;
	}
}
