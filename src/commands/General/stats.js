const { Command, version: klasaVersion, Duration } = require("klasa");
const { version: discordVersion } = require("discord.js");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			guarded: true,
			description: `Shows some stats about this bot`,
		});
	}

	async run (msg) {
		let [users, guilds, channels, memory] = [0, 0, 0, 0];

		if (this.client.shard) {
			const results = await this.client.shard.broadcastEval(`[this.users.size, this.guilds.size, this.channels.size, (process.memoryUsage().heapUsed / 1024 / 1024)]`);
			for (const result of results) {
				users += result[0];
				guilds += result[1];
				channels += result[2];
				memory += result[3];
			}
		}
		return msg.send({
			embed: {
				color: 0x3669FA,
				title: `Stats for ${this.client.user.username}`,
				fields: [
					{
						name: `Guilds`,
						value: (guilds || this.client.guilds.size).toLocaleString(),
						inline: true,
					},
					{
						name: `Channels`,
						value: (channels || this.client.channels.size).toLocaleString(),
						inline: true,
					},
					{
						name: `Users`,
						value: (users || this.client.users.size).toLocaleString(),
						inline: true,
					},
					{
						name: `Uptime`,
						value: Timestamp.toNow(Date.now() - (process.uptime() * 1000)),
						inline: true,
					},
					{
						name: `Memory Used`,
						value: `${(memory || process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
						inline: true,
					},
					{
						name: `CPU Usage`,
						value: `${(await this.client.getCPUUsage()).toFixed(2)}%`,
						inline: true,
					},
					{
						name: `Discord.js Version`,
						value: `${discordVersion}`,
						inline: true,
					},
					{
						name: `Klasa Version`,
						value: `${klasaVersion}`,
						inline: true,
					},
					{
						name: `Node Versions`,
						value: `Node ${process.version}`,
						inline: true,
					},
				],
			},
		});
	}
};
