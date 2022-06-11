import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { Emojis, HelpDetailedDescriptionReplacers, orList } from '#utils/misc';
import { bold, inlineCode, quote, roleMention } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, Identifiers, UserError } from '@sapphire/framework';
import { SubcommandMappingArray, SubcommandPluginCommand } from '@sapphire/plugin-subcommands';
import type { Message, Role } from 'discord.js';

@ApplyOptions<SubcommandPluginCommand.Options>({
	generateDashLessAliases: true,
	generateUnderscoreLessAliases: true,
	description: 'Controls who can use Highlight in your server',
	detailedDescription: [
		quote("If you want to check the status of the allowed roles in this server, here's how to do it:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/allowed-roles status'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} allowed-roles status`),
		)}`,
		'',
		quote("If you want to toggle the allowed role check on or off, here's how to do it:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/allowed-roles toggle'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} allowed-roles toggle`),
		)}`,
		'',
		quote("If you want to add or remove a role from the allowed roles list, here's how to do it:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(
			inlineCode('/allowed-roles add role:@Role'),
		)} or ${bold(inlineCode('/allowed-roles remove role:@Role'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} allowed-roles add @Role`),
		)} or ${bold(inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} allowed-roles remove @Role`))}`,
		'',
		quote("If you want to clear the allowed role list, here's how to do it:"),
		'',
		`For ${Emojis.ChatInputCommands} chat input commands: ${bold(inlineCode('/allowed-roles clear'))}`,
		`For message based commands: ${bold(
			inlineCode(`${HelpDetailedDescriptionReplacers.UserMention} allowed-roles clear`),
		)}`,
	].join('\n'),
	// TODO: yeet this in favor of perms v2
	preconditions: ['GuildStaff'],
})
export class AllowedRolesCommand extends SubcommandPluginCommand {
	public readonly subcommandMappings: SubcommandMappingArray<this> = [
		{
			name: 'status',
			messageRun: (message) => this.statusSubcommand(message, true),
			chatInputRun: (interaction: Command.ChatInputInteraction<'cached'>) => this.statusSubcommand(interaction, false),
		},
		{
			name: 'toggle',
			messageRun: (message) => this.toggleSubcommand(message, true),
			chatInputRun: (interaction: Command.ChatInputInteraction<'cached'>) => this.toggleSubcommand(interaction, false),
		},
		{
			name: 'clear',
			messageRun: (message) => this.clearSubcommand(message, true),
			chatInputRun: (interaction: Command.ChatInputInteraction<'cached'>) => this.clearSubcommand(interaction, false),
		},
		{
			name: 'add',
			messageRun: async (message, args) => {
				// Get the role
				const role = await args.pick('role').catch((err: UserError) => {
					throw new UserError({
						identifier: 'no-role',
						message:
							err.identifier === Identifiers.ArgsMissing
								? 'You need to provide a role to add.'
								: 'That is not a valid role.',
					});
				});

				return this.addSubcommand(message, role, true);
			},
			chatInputRun: async (interaction: Command.ChatInputInteraction<'cached'>) => {
				// Get the role
				const role = interaction.options.getRole('role', true) as Role;

				return this.addSubcommand(interaction as never, role, false);
			},
		},
		{
			name: 'remove',
			messageRun: async (message, args) => {
				// Get the role
				const role = await args.pick('role').catch((err: UserError) => {
					throw new UserError({
						identifier: 'no-role',
						message:
							err.identifier === Identifiers.ArgsMissing
								? 'You need to provide a role to remove.'
								: 'That is not a valid role.',
					});
				});

				return this.removeSubcommand(message, role, true);
			},
			chatInputRun: async (interaction: Command.ChatInputInteraction<'cached'>) => {
				// Get the role
				const role = interaction.options.getRole('role', true) as Role;

				return this.removeSubcommand(interaction as never, role, false);
			},
		},
	];

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.addSubcommand((status) =>
						status.setName('status').setDescription('Check the status of the allowed roles check'),
					)
					.addSubcommand((toggle) =>
						toggle.setName('toggle').setDescription('Toggles the allowed role check in the server'),
					)
					.addSubcommand((add) =>
						add
							.setName('add')
							.setDescription('Adds the role to the allowed role list')
							.addRoleOption((role) => role.setName('role').setDescription('The role to add').setRequired(true)),
					)
					.addSubcommand((remove) =>
						remove
							.setName('remove')
							.setDescription('Removes the role from the allowed role list')
							.addRoleOption((role) => role.setName('role').setDescription('The role to remove').setRequired(true)),
					)
					.addSubcommand((clear) => clear.setName('clear').setDescription('Clears the allowed role list')),
			{
				guildIds: useDevelopmentGuildIds(),
				idHints: [
					// HighlightDev - Sapphire Guild Command
					'955226385117491280',
				],
			},
		);
	}

	public async statusSubcommand(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		isMessage: boolean,
	) {
		const dbData = await this.container.prisma.guildPermission.findFirst({
			where: { guildId: messageOrInteraction.guildId! },
		});

		const rawIds = dbData?.allowedRoles ?? [];
		const resolvedRoles = [];

		for (const id of rawIds) {
			const role = messageOrInteraction.guild!.roles.resolve(id);

			if (role) {
				resolvedRoles.push(role);
			} else {
				resolvedRoles.push({ id, position: -1, name: 'Unknown role' });
			}
		}

		const list = orList.format(
			resolvedRoles
				.sort((a, b) => b.position - a.position)
				.map((role) => (role.position === -1 ? `${role.name} (${inlineCode(role.id)})` : roleMention(role.id))),
		);

		const embed = createInfoEmbed(
			[
				`Members require one of the allowed roles in order to use Highlight: ${bold(
					dbData?.requiresOneOfAllowedRoles ? 'Yes' : 'No',
				)}`,
				'',
				`Allowed roles: ${
					list ||
					`No roles added yet. If you want to add some, use the ${bold(inlineCode('/allowed-roles add'))} command.`
				}`,
			].join('\n'),
		);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					ephemeral: true,
					embeds: [embed],
				},
			}),
		);
	}

	private async toggleSubcommand(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		isMessage: boolean,
	) {
		const previousDbState = await this.container.prisma.guildPermission.findFirst({
			where: { guildId: messageOrInteraction.guildId! },
			select: { requiresOneOfAllowedRoles: true },
		});

		const previousValue = previousDbState?.requiresOneOfAllowedRoles ?? false;
		const newValue = !previousValue;

		await this.container.prisma.guildPermission.upsert({
			where: { guildId: messageOrInteraction.guildId! },
			create: { guildId: messageOrInteraction.guildId!, requiresOneOfAllowedRoles: newValue },
			update: { requiresOneOfAllowedRoles: newValue },
		});

		const embed = createInfoEmbed(
			`The requirement of allowed roles for members in order to use Highlight has been turned ${bold(
				newValue ? 'on' : 'off',
			)}`,
		);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					ephemeral: true,
					embeds: [embed],
				},
			}),
		);
	}

	private async addSubcommand(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		role: Role,
		isMessage: boolean,
	) {
		this.checkEveryoneRoleId(messageOrInteraction.guild!.roles.everyone.id, role.id);

		const dbData = await this.container.prisma.guildPermission.findFirst({
			where: { guildId: messageOrInteraction.guildId! },
			select: { allowedRoles: true },
		});

		if (dbData?.allowedRoles.includes(role.id)) {
			throw new UserError({
				identifier: 'already-present',
				message: `The role ${role} is already present in the allowed role list.`,
			});
		}

		const roleSet = new Set(dbData?.allowedRoles ?? []);
		roleSet.add(role.id);
		const roleArray = [...roleSet];

		await this.container.prisma.guildPermission.upsert({
			where: { guildId: messageOrInteraction.guildId! },
			update: { allowedRoles: roleArray },
			create: { guildId: messageOrInteraction.guildId!, allowedRoles: roleArray },
		});

		const embed = createInfoEmbed(`Added the role ${role} to the allowed role list`);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					ephemeral: true,
					embeds: [embed],
				},
			}),
		);
	}

	private async removeSubcommand(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		role: Role,
		isMessage: boolean,
	) {
		this.checkEveryoneRoleId(messageOrInteraction.guild!.roles.everyone.id, role.id);

		const dbData = await this.container.prisma.guildPermission.findFirst({
			where: { guildId: messageOrInteraction.guildId! },
			select: { allowedRoles: true },
		});

		if (!dbData || !dbData.allowedRoles.includes(role.id)) {
			throw new UserError({
				identifier: 'not-already-present',
				message: `The role ${role} is not present in the allowed role list.`,
			});
		}

		const roleSet = new Set(dbData?.allowedRoles ?? []);
		roleSet.delete(role.id);
		const roleArray = [...roleSet];

		await this.container.prisma.guildPermission.upsert({
			where: { guildId: messageOrInteraction.guildId! },
			update: { allowedRoles: roleArray },
			create: { guildId: messageOrInteraction.guildId!, allowedRoles: roleArray },
		});

		const embed = createInfoEmbed(`Removed the role ${role} from the allowed role list`);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					ephemeral: true,
					embeds: [embed],
				},
			}),
		);
	}

	private async clearSubcommand(
		messageOrInteraction: Message | Command.ChatInputInteraction<'cached'>,
		isMessage: boolean,
	) {
		await this.container.prisma.guildPermission.upsert({
			where: { guildId: messageOrInteraction.guildId! },
			create: { guildId: messageOrInteraction.guildId!, allowedRoles: [] },
			update: { allowedRoles: [] },
		});

		const embed = createInfoEmbed(`The allowed roles list has been ${bold('cleared')}!`);

		await messageOrInteraction.reply(
			withDeprecationWarningForMessageCommands({
				commandName: this.name,
				guildId: messageOrInteraction.guildId,
				receivedFromMessage: isMessage,
				options: {
					ephemeral: true,
					embeds: [embed],
				},
			}),
		);
	}

	private checkEveryoneRoleId(everyoneRoleId: string, providedRoleId: string) {
		if (providedRoleId === everyoneRoleId) {
			throw new UserError({
				identifier: 'everyone-role-id',
				message: 'The provided role is the @everyone role. Please provide a different role.',
			});
		}
	}
}
