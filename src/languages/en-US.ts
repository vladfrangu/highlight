import { Language, version as klasaVersion } from 'klasa';
import { MessageEmbed } from 'discord.js';
import { StatsGeneral, StatsUptime, StatsUsage } from '../commands/General/stats';
import FriendlyDuration from '../lib/utils/FriendlyDuration';

function duration(time: number, precision?: number) {
	return FriendlyDuration(time, precision);
}

export default class extends Language {
	language = {
		PREFIX_REMINDER: (prefix = 'h.') => new MessageEmbed()
			.setColor(0x3669FA)
			.setTitle('Are you lost?')
			.setDescription(`Run **${prefix}help** to see what commands I have`)
			.setThumbnail(this.client.user!.displayAvatarURL({ size: 512, format: 'png', dynamic: true })) as unknown as string,
		COMMAND_STATS: (stats: StatsGeneral, uptime: StatsUptime, usage: StatsUsage) => new MessageEmbed()
			.setColor(0x3669FA)
			.addField('Statistics', [
				`• **Guilds**: ${stats.GUILDS}`,
				`• **Channels**: ${stats.CHANNELS}`,
				`• **Users**: ${stats.USERS}`,
				`• **Discord.js**: ${stats.VERSION}`,
				`• **Node.js**: ${stats.NODE_JS}`,
				`• **Klasa**: ${klasaVersion}`,
			].join('\n'))
			.addField('Uptime', [
				`• **Host**: ${duration(uptime.HOST, 2)}`,
				`• **Total**: ${duration(uptime.TOTAL, 2)}`,
				`• **Client**: ${duration(uptime.CLIENT, 2)}`,
			].join('\n'))
			.addField('Server Usage', [
				`• **CPU Usage**: ${(usage.CPU_USAGE! * 100).toFixed(2)}%`,
				`• **Heap**: ${usage.RAM_USED} (Total: ${usage.RAM_TOTAL})`,
			].join('\n')) as unknown as string,
	};
}
