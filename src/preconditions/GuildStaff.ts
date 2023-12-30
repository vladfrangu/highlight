import { Precondition } from '@sapphire/framework';
import { PermissionFlagsBits, bold, type CommandInteraction, type Message, type PermissionsBitField } from 'discord.js';
import { orList } from '#utils/misc';

export class GuildStaff extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.inCachedGuild()) {
			return this.error({ message: 'You cannot run this command outside of a server.' });
		}

		const member = await interaction.guild.members.fetch(interaction.user.id);

		return this._sharedRun(member.permissions);
	}

	public override async messageRun(message: Message) {
		if (!message.inGuild()) {
			return this.error({ message: 'You cannot run this command outside of a server.' });
		}

		const member = await message.guild.members.fetch(message.author.id);

		return this._sharedRun(member.permissions);
	}

	private async _sharedRun(permissions: PermissionsBitField) {
		if (
			permissions.any(
				[
					// Can manage the entire guild
					PermissionFlagsBits.ManageGuild,
					// Can manage roles
					PermissionFlagsBits.ManageRoles,
					// Can moderate members
					PermissionFlagsBits.ModerateMembers,
				],
				true,
			)
		) {
			return this.ok();
		}

		const permissionList = orList.format(
			['Moderate Members', 'Manage Server', 'Manage Roles'].map((item) => bold(item)),
		);

		return this.error({
			message: `You do not have enough permissions to run this command. Only server members that have one of the following permissions can run this command: ${permissionList}`,
		});
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		GuildStaff: never;
	}
}
