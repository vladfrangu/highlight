import { promisify } from 'util';
import { cpus } from 'os';
import re2 from 're2';
import { MessageEmbed } from 'discord.js';

const sleep = promisify(setTimeout);

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

export function createInfoEmbed(description?: string) {
	return new MessageEmbed({ color: 0x3669fa, description });
}

export function createErrorEmbed(description?: string) {
	return new MessageEmbed({ color: 0xcc0f16, description });
}

export function createSuccessEmbed(description?: string) {
	return new MessageEmbed({ color: 0x43b581, description });
}
