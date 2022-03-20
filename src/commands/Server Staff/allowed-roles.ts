import { useDevelopmentGuildIds } from '#hooks/useDevelopmentGuildIds';
import { withDeprecationWarningForMessageCommands } from '#hooks/withDeprecationWarningForMessageCommands';
import { createInfoEmbed } from '#utils/embeds';
import { Emojis, HelpDetailedDescriptionReplacers, orList } from '#utils/misc';
import { bold, inlineCode, quote, roleMention } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command, err, Identifiers, UserError } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
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
	preconditions: ['GuildStaff'],
})
export class AllowedRolesCommand extends Command {
	private readonly subcommandMatcher = Args.make((parameter) => {
		switch (parameter.toLowerCase()) {
			case 'status':
			case 'toggle':
			case 'add':
			case 'remove':
				return Args.ok(parameter.toLowerCase());
			default: {
				const list = orList.format(['add', 'remove', 'status', 'toggle'].sort().map((item) => bold(inlineCode(item))));

				return err(
					new UserError({
						identifier: 'invalid-subcommand',
						message: `The subcommand you provided (${bold(
							inlineCode(parameter),
						)}) is not a valid one. Expected one of: ${list}`,
					}),
				);
			}
		}
	});

	public override chatInputRun(interaction: Command.ChatInputInteraction) {
		const subcommand = interaction.options.getSubcommand(true);

		switch (subcommand.toLowerCase()) {
			case 'status': {
				return this.statusSubcommand(interaction, false);
			}
			case 'toggle': {
				return this.toggleSubcommand(interaction, false);
			}
			case 'add': {
				// Get the role
				const role = interaction.options.getRole('role', true);

				return this.addSubcommand(interaction, role, false);
			}
			case 'remove': {
				// Get the role
				const role = interaction.options.getRole('role', true);

				return this.removeSubcommand(interaction, role, false);
			}
		}
	}

	public override async messageRun(message: Message, args: Args) {
		const subcommand = await args.pick(this.subcommandMatcher).catch((err: UserError) => {
			const list = orList.format(['add', 'remove', 'status', 'toggle'].sort().map((item) => bold(inlineCode(item))));

			throw err.identifier === Identifiers.ArgsMissing
				? new UserError({
						identifier: 'no-args',
						message: `You need to provide one of the following subcommands: ${list}`,
				  })
				: err;
		});

		switch (subcommand) {
			case 'status': {
				return this.statusSubcommand(message, true);
			}
			case 'toggle': {
				return this.toggleSubcommand(message, true);
			}
			case 'add': {
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
			}
			case 'remove': {
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
			}
		}
	}

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
					),
			{
				guildIds: useDevelopmentGuildIds(),
				idHints: [
					// HighlightDev - Sapphire Guild Command
					'955226385117491280',
				],
			},
		);
	}

	private async statusSubcommand(messageOrInteraction: Message | Command.ChatInputInteraction, isMessage: boolean) {
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

	private toggleSubcommand(_messageOrInteraction: Message | Command.ChatInputInteraction, _isMessage: boolean) {
		throw new Error('Method not implemented.');
	}

	private addSubcommand(
		_messageOrInteraction: Message | Command.ChatInputInteraction,
		_role: unknown,
		_isMessage: boolean,
	) {
		throw new Error('Method not implemented.');
	}

	private removeSubcommand(
		_messageOrInteraction: Message | Command.ChatInputInteraction,
		_role: unknown,
		_isMessage: boolean,
	) {
		throw new Error('Method not implemented.');
	}
}
