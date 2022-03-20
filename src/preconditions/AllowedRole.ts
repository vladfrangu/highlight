import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, GuildMember, Message } from 'discord.js';

export class AllowedRole extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.inCachedGuild()) {
			return this.error({ message: 'You cannot run this command outside of a server.' });
		}

		const member = await interaction.guild.members.fetch(interaction.user.id);

		return this._sharedRun(interaction.guild.id, member);
	}

	public override async messageRun(message: Message) {
		if (!message.inGuild()) {
			return this.error({ message: 'You cannot run this command outside of a server.' });
		}

		const member = await message.guild.members.fetch(message.author.id);

		return this._sharedRun(message.guildId, member);
	}

	private async _sharedRun(guildId: string, member: GuildMember) {
		const guildSettings = await this.container.prisma.guildPermission.findFirst({
			where: {
				guildId,
				requiresOneOfAllowedRoles: true,
			},
		});

		// If we don't have any settings registered/enabled, we are safe to assume anyone can run commands
		if (!guildSettings) {
			return this.ok();
		}

		if (guildSettings.allowedRoles.some((id) => member.roles.cache.has(id))) {
			return this.ok();
		}

		return this.error({
			message: `You do not have one of the roles required to run this command.`,
		});
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		AllowedRole: never;
	}
}
