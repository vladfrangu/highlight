const { Client } = require("klasa");
const os = require("os");

module.exports = class HighlightClient extends Client {
	async getCPUUsage () {
		const { idle: startIdle, total: startTotal } = getCPUInfo();
		await this.methods.util.sleep(1000);
		const { idle: endIdle, total: endTotal } = getCPUInfo();
		return 1 - ((endIdle - startIdle) / (endTotal - startTotal));
	}
};

function getCPUInfo () {
	let cpus = os.cpus();

	let user = 0, nice = 0, sys = 0, idle = 0, irq = 0, total = 0;

	for (let i = 0; i < cpus.length; i++) {
		user += cpus[i].times.user;
		nice += cpus[i].times.nice;
		sys += cpus[i].times.sys;
		irq += cpus[i].times.irq;
		idle += cpus[i].times.idle;
	}

	total = user + nice + sys + idle + irq;

	return { total, idle };
}
