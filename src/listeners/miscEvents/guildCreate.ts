import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { TimestampStyles, time, type Guild } from 'discord.js';
import { useGuildJoinLeaveWebhook } from '#hooks/useGuildJoinLeaveWebhook';
import { createInfoEmbed } from '#utils/embeds';
import { pluralize } from '#utils/misc';
import { getUserTag } from '#utils/tags';

@ApplyOptions<Listener.Options>({
	name: 'GuildCreateLogger',
	event: Events.GuildCreate,
})
export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
	public override async run(guild: Guild) {
		const { logger, colors, client, prisma } = this.container;

		// Always make sure the guild is in the database
		await prisma.$queryRaw`INSERT INTO guilds (guild_id) VALUES (${guild.id}) ON CONFLICT DO NOTHING`;

		const webhook = useGuildJoinLeaveWebhook();

		const memberLabel = pluralize(guild.memberCount, 'member', 'members');

		const owner = await client.users.fetch(guild.ownerId);

		logger.info(
			`${colors.magenta('Application added to guild: ')}${colors.cyanBright(guild.name)} (${colors.green(
				guild.id,
			)}) with ${colors.green(guild.memberCount.toLocaleString())} ${memberLabel}, owned by ${colors.green(
				getUserTag(owner),
			)}`,
		);

		const embed = createInfoEmbed(`Application added to guild: ${guild.name} (${guild.id})`)
			.setFields(
				{
					name: 'Member count',
					value: `**${guild.memberCount.toLocaleString()}** ${memberLabel}`,
					inline: true,
				},
				{
					name: 'Created at',
					value: `${time(
						guild.createdTimestamp,
						TimestampStyles.ShortDateTime,
					)} (${guild.createdAt.toISOString()})`,
					inline: true,
				},
				{
					name: 'Owner',
					value: getUserTag(owner),
					inline: true,
				},
			)
			.setAuthor({
				name: client.user!.tag,
				iconURL: client.user!.displayAvatarURL(),
			});

		if (guild.icon) {
			embed.setThumbnail(guild.iconURL());
		}

		await webhook.send({ embeds: [embed], avatarURL: client.user!.displayAvatarURL(), username: 'Guild joined' });
	}
}
