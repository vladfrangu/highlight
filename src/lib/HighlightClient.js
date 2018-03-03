const { Client } = require("klasa");
const os = require("os");

module.exports = class HighlightClient extends Client {
	async login (token) {
		// Same Jacz
		await Promise.all(this.pieceStores.map(store => store.loadAll())).catch(err => {
			console.error(err);
			process.exit(-1);
		});
		await this.providers.init();
		await this.gateways.add("members", {
			words: {
				type: "string",
				default: [],
				min: null,
				max: null,
				array: true,
				configurable: true,
				sql: "TEXT",
			},
			blacklistedUsers: {
				type: "user",
				default: [],
				min: null,
				max: null,
				array: true,
				configurable: true,
				sql: "TEXT",
			},
			blacklistedChannels: {
				type: "textchannel",
				default: [],
				min: null,
				max: null,
				array: true,
				configurable: true,
				sql: "TEXT",
			},
		}, { provider: "json" }, false);
		return super.login(token);
	}

	async getCPUUsage () {
		const { idle: startIdle, total: startTotal } = getCPUInfo();
		await this.methods.util.sleep(1000);
		const { idle: endIdle, total: endTotal } = getCPUInfo();

		let idle = endIdle - startIdle;
		let total = endTotal - startTotal;
		let perc = idle / total;
		return 1 - perc;
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
