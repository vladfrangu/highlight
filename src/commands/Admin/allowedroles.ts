import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, Role } from 'discord.js';
import { pluralize } from '../../lib/utils/Util';

const NEEDS_ROLE = ['toggle', 'status', 'clear'];
const EMOJI_MAP = new Map([
	[true, '✅'],
	[false, '❌'],
]);

@ApplyOptions<CommandOptions>({
	aliases: ['ar'],
	description: 'Allows to choose who may add highlight words or patterns',
	permissionLevel: 6,
	quotedStringSupport: true,
	runIn: ['text'],
	subcommands: true,
	usage: '<toggle|add|remove|set|clear|status:default> (roles:roles)',
	usageDelim: ' ',
	extendedHelp: [
		"→ If you want to see the current status of the allowed roles check, and which roles can use the highlighting features, if enabled",
		'`{prefix}allowedroles [status]` → Specifying `status` is optional as it is the default subcommand',
		"",
		"→ Toggling the allowed role check",
		"`{prefix}allowedroles toggle` → Enables (✅) or disables (❌) the role checking",
		"",
		"→ Adding, or removing a role (or multiple roles) from being able to use highlighting features if the role checking is enabled",
		"`{prefix}allowedroles add @Proficient 339959033937264641` → Adds the roles specified, if they aren't added already",
		"`{prefix}allowedroles remove @Proficient` → Removes the roles specified, if they were added",
		"",
		"→ Clearing the role list, if you want to start from a blank slate",
		"`{prefix}allowedroles clear`",
	].join('\n'),
})
export default class extends Command {
	async status(message: KlasaMessage) {
		if (!message.guild) throw new Error('Unreachable');

		const [rolesRequired, roleIDs] = message.guild.settings.pluck('permissions.requiresRole', 'permissions.allowedRoles') as [boolean, string[]];
		const roles = roleIDs.map((id) => message.guild!.roles.resolve(id) || { name: `Unknown Role`, id, position: -1 })
			.sort((a, b) => b.position - a.position);

		const embed = new MessageEmbed()
			.setColor(0x3669FA)
			.setDescription(`Require role to use Highlight: ${EMOJI_MAP.get(rolesRequired)}`);

		if (roles.length)
			embed.addField(`Allowed ${pluralize(roles.length, 'Role', 'Roles')}`, `- ${roles.map(({ id, name }) => `${name} — ${id}`).join('\n- ')}`);

		return message.send(embed);
	}

	async toggle(message: KlasaMessage) {
		if (!message.guild) throw new Error('Unreachable');

		const previousState = message.guild.settings.get('permissions.requiresRole') as boolean;
		await message.guild.settings.update('permissions.requiresRole', !previousState);

		return message.send(new MessageEmbed()
			.setColor(0x43B581)
			.setDescription(`Toggled role requirement: ${EMOJI_MAP.get(previousState)} => ${EMOJI_MAP.get(!previousState)}`),
		);
	}

	async add(message: KlasaMessage, [roles]: [Role[]]) {
		if (!message.guild) throw new Error('Unreachable');

		const previousRoles = message.guild.settings.get('permissions.allowedRoles') as string[];
		// Make sure there are no duplicates
		const roleSet = new Set(roles);

		const newRoles = [];

		for (const role of roleSet)
			if (!previousRoles.includes(role.id)) newRoles.push(role);

		await message.guild.settings.update('permissions.allowedRoles', newRoles, { arrayAction: 'add' });

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No new roles have been added..');

		if (newRoles.length) {
			embed.setTitle(`The following ${pluralize(newRoles.length, 'role', 'roles')} can now use Highlight features`)
				.setDescription(`- ${newRoles.sort((a, b) => b.position - a.position).map(({ id, name }) => `${name} — ${id}`).join('\n- ')}`);
		}

		return message.send(embed);
	}

	async remove(message: KlasaMessage, [roles]: [Role[]]) {
		if (!message.guild) throw new Error('Unreachable');

		const previousRoles = [...message.guild.settings.get('permissions.allowedRoles') as string[]];
		// Make sure there are no duplicates
		const roleSet = new Set(roles);

		const removed = new Set<Role>();

		for (const role of roleSet) {
			const index = previousRoles.indexOf(role.id);
			if (index === -1) continue;
			removed.add(role);
			previousRoles.splice(index, 1);
		}

		await message.guild.settings.update('permissions.allowedRoles', previousRoles, { arrayAction: 'overwrite' });

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setDescription('No roles have been removed..');

		if (removed.size) {
			embed.setTitle(`The following ${pluralize(removed.size, 'role', 'roles')} cannot use Highlight features anymore`)
				.setDescription(`- ${[...removed].sort((a, b) => b.position - a.position).map(({ id, name }) => `${name} — ${id}`).join('\n- ')}`);
		}

		return message.send(embed);
	}

	async set(message: KlasaMessage, [roles]: [Role[]]) {
		if (!message.guild) throw new Error('Unreachable');

		// Make sure there are no duplicates
		const roleSet = new Set(roles);

		await message.guild.settings.update('permissions.allowedRoles', [...roleSet], { arrayAction: 'overwrite' });

		const embed = new MessageEmbed()
			.setColor(0x43B581)
			.setTitle(`The following ${pluralize(roleSet.size, 'role', 'roles')} can now use Highlight features`)
			.setDescription(`- ${[...roleSet].sort((a, b) => b.position - a.position).map(({ id, name }) => `${name} — ${id}`).join('\n- ')}`);

		return message.send(embed);
	}

	async clear(message: KlasaMessage) {
		if (!message.guild) throw new Error('Unreachable');

		await message.guild.settings.reset('permissions.allowedRoles');

		return message.send(
			new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('The role list has been cleared'),
		);
	}

	async init() {
		this.createCustomResolver('roles', (arg, possible, message, params) => {
			if (!NEEDS_ROLE.includes(params[0])) return this.client.arguments.get('...role')!.run(arg, possible, message);
			return undefined;
		});
	}
}
