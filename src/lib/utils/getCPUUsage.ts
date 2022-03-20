import { cpus } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

function getCPUInfo() {
	const cpuInfo = cpus();

	let user = 0;
	let nice = 0;
	let sys = 0;
	let idle = 0;
	let irq = 0;
	let total = 0;

	for (const cpu of cpuInfo) {
		user += cpu.times.user;
		nice += cpu.times.nice;
		sys += cpu.times.sys;
		irq += cpu.times.irq;
		idle += cpu.times.idle;
	}

	total = user + nice + sys + idle + irq;

	return { total, idle };
}

export async function getCPUUsage() {
	const { idle: startIdle, total: startTotal } = getCPUInfo();
	await sleep(1000);
	const { idle: endIdle, total: endTotal } = getCPUInfo();
	return 1 - (endIdle - startIdle) / (endTotal - startTotal);
}
