import { useGuildJoinLeaveWebhook } from '#hooks/useGuildJoinLeaveWebhook';
import { createInfoEmbed } from '#utils/embeds';
import { pluralize } from '#utils/misc';
import { time, TimestampStyles } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	name: 'GuildDeleteLogger',
	event: Events.GuildDelete,
})
export class GuildDeleteListener extends Listener<typeof Events.GuildDelete> {
	public override async run(guild: Guild) {
		const { logger, colors, client } = this.container;

		const webhook = useGuildJoinLeaveWebhook();

		const memberLabel = pluralize(guild.memberCount, 'member', 'members');

		logger.info(
			`${colors.magenta('Application removed to guild: ')}${colors.cyanBright(guild.name)} (${colors.green(
				guild.id,
			)}) with ${colors.green(guild.memberCount.toLocaleString())} ${memberLabel}`,
		);

		const embed = createInfoEmbed(`Application removed from guild: ${guild.name} (${guild.id})`)
			.addField('Member count', `**${guild.memberCount.toLocaleString()}** ${memberLabel}`, true)
			.addField(
				'Created at',
				`${time(guild.createdTimestamp, TimestampStyles.ShortDateTime)} (${guild.createdAt.toISOString()})`,
				true,
			)
			.setAuthor({
				name: client.user!.tag,
				iconURL: client.user!.displayAvatarURL(),
			});

		if (guild.icon) {
			embed.setThumbnail(guild.iconURL()!);
		}

		await webhook.send({ embeds: [embed], avatarURL: client.user!.displayAvatarURL(), username: 'Guild left' });
	}
}
