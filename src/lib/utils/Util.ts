import { cpus } from 'os';
import { sleep } from '@klasa/utils';
import re2 from 're2';
import { WorkerTypes, NormalizedWorkerTypes } from '../types/Workers';
import { GuildWorkerType } from '../types/Misc';

function getCPUInfo() {
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
}

export async function getCPUUsage() {
	const { idle: startIdle, total: startTotal } = getCPUInfo();
	await sleep(1000);
	const { idle: endIdle, total: endTotal } = getCPUInfo();
	return 1 - ((endIdle - startIdle) / (endTotal - startTotal));
}

export function normalizeType(type: WorkerTypes) {
	if (type === WorkerTypes.Word) return NormalizedWorkerTypes.WordWorker;
	if (type === WorkerTypes.Regex) return NormalizedWorkerTypes.RegexWorker;
	return 'Unknown Worker';
}

export function guildTypeToWorkerType(type: GuildWorkerType) {
	if (type === 'words') return WorkerTypes.Word;
	if (type === 'regularExpressions') return WorkerTypes.Regex;
	return WorkerTypes.Word;
}

export function tryRegex(input: string): [boolean, re2 | null] {
	try {
		return [true, new re2(input, 'ig')];
	} catch {
		return [false, null];
	}
}

export function pluralize(count: number, singular: string, plural: string) {
	return count === 1 ? singular : plural;
}
