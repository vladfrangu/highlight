import { Command, CommandOptions, KlasaMessage } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageEmbed, User, TextChannel } from 'discord.js';
import { pluralize } from '../../lib/utils/Util';

const NEEDS_ROLE = ['list', 'clear'];

@ApplyOptions<CommandOptions>({
	description: 'Control who you block from highlighting you',
	quotedStringSupport: true,
	runIn: ['text'],
	subcommands: true,
	usage: '<add|remove|clear|list:default> (userOrChannel:userchannel)',
	usageDelim: ' ',
	extendedHelp: [
		"→ If you want to see the which channels and users you have blocked in this server",
		'`{prefix}block [list]` → Specifying `list` is optional as it is the default subcommand',
		"",
		"→ Adding, or removing a user / channel (or multiple users / channels) that cannot highlight you anymore. You can also use IDs with these subcommands",
		"`{prefix}block add @Vladdy#0002 #bot-commands` → Adds the users / channels specified, if they aren't added already.",
		"`{prefix}block remove @Vladdy#0002` → Removes the users / channels specified, if they were added",
		"",
		"→ Clearing the block list, if you are feeling nice",
		"`{prefix}block clear`",
	].join('\n'),
})
export default class extends Command {
	needsMember = true;

	async list(message: KlasaMessage) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const [userIDs, channelIDs] = message.member.settings.pluck('blacklist.users', 'blacklist.channels') as [string[], string[]];

		const users = await Promise.all(userIDs.map(this._fetchTag.bind(this)));

		const embed = new MessageEmbed()
			.setColor(0x3669FA);

		if (users.length)
			embed.addField(`Blocked ${pluralize(users.length, 'User', 'Users')}`, `- ${users.join('\n- ')}`);

		if (channelIDs.length)
			embed.addField(`Blocked ${pluralize(channelIDs.length, 'Channel', 'Channels')}`, `- ${channelIDs.map((id) => `<#${id}> — ${id}`).join('\n- ')}`);

		if (!users.length && !channelIDs.length)
			embed.setDescription("You don't have anyone blocked...*yet*");

		return message.send(embed);
	}
	async add(message: KlasaMessage, [[users, channels]]: [[User[], TextChannel[]]]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const [previousUsers, previousChannels] = message.member.settings.pluck('blacklist.users', 'blacklist.channels') as [string[], string[]];

		// Make sure there are no duplicates
		const userSet = new Set(users);
		const channelSet = new Set(channels);

		const changes: [User[], TextChannel[]] = [[], []];

		for (const user of userSet)
			if (!previousUsers.includes(user.id)) changes[0].push(user);

		for (const channel of channelSet)
			if (!previousChannels.includes(channel.id)) changes[1].push(channel);

		await message.member.settings.update([
			['blacklist.users', changes[0]],
			['blacklist.channels', changes[1]],
		], { arrayAction: 'add' });

		const embed = new MessageEmbed()
			.setColor(0x43B581);

		if (changes[0].length) {
			const tags = await Promise.all(changes[0].map(this._fetchTag.bind(this)));
			embed.addField(`The following ${pluralize(changes[0].length, 'user has', 'users have')} been blocked`, `- ${tags.join('\n- ')}`);
		}

		if (changes[1].length)
			embed.addField(`The following ${pluralize(changes[1].length, 'channel has', 'channels have')} been blocked`, `- ${changes[1].map((channel) => `${channel} — ${channel.id}`).join('\n- ')}`);

		if (!changes[0].length && !changes[1].length) embed.setDescription('No changes have been made to your block list..');

		return message.send(embed);
	}

	async remove(message: KlasaMessage, [[users, channels]]: [[User[], TextChannel[]]]) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		const [previousUsers, previousChannels] = message.member.settings.pluck('blacklist.users', 'blacklist.channels') as [string[], string[]];

		// Make sure there are no duplicates
		const userSet = new Set(users);
		const channelSet = new Set(channels);

		const changes: [string[], string[]] = [[...previousUsers], [...previousChannels]];
		const removedUsers = new Set<User>();
		const removedChannels = new Set<TextChannel>();

		for (const user of userSet) {
			const index = changes[0].indexOf(user.id);
			if (index === -1) continue;
			removedUsers.add(user);
			changes[0].splice(index, 1);
		}

		for (const channel of channelSet) {
			const index = changes[1].indexOf(channel.id);
			if (index === -1) continue;
			removedChannels.add(channel);
			changes[1].splice(index, 1);
		}

		await message.member.settings.update([
			['blacklist.users', changes[0]],
			['blacklist.channels', changes[1]],
		], { arrayAction: 'overwrite' });

		const embed = new MessageEmbed()
			.setColor(0x43B581);

		if (removedUsers.size) {
			const tags = await Promise.all([...removedUsers].map(this._fetchTag.bind(this)));
			embed.addField(`The following ${pluralize(changes[0].length, 'user has', 'users have')} been unblocked`, `- ${tags.join('\n- ')}`);
		}

		if (removedChannels.size)
			embed.addField(`The following ${pluralize(changes[1].length, 'channel has', 'channels have')} been blocked`, `- ${[...removedChannels].map((channel) => `${channel} — ${channel.id}`).join('\n- ')}`);

		if (!changes[0].length && !changes[1].length) embed.setDescription('No changes have been made to your block list..');

		return message.send(embed);
	}

	async clear(message: KlasaMessage) {
		if (!message.guild || !message.member) throw new Error('Unreachable');

		await message.member.settings.reset(['blacklist.users', 'blacklist.channels']);

		return message.send(
			new MessageEmbed()
				.setColor(0x43B581)
				.setDescription('Your block list was reset'),
		);
	}

	async init() {
		this.createCustomResolver('userchannel', async(argument, possible, message, params) => {
			if (NEEDS_ROLE.includes(params[0])) return undefined;
			const { userArgument, textChannelArgument } = this;
			const users = [];
			const channels = [];
			const { min, max } = possible;
			const { args, usage: { usageDelim } } = message['prompter']!;
			const index = args.indexOf(argument);
			const rest = args.splice(index, args.length - index);

			let i = 0;

			for (const arg of rest) {
				if (max && i > max) break;
				try {
					const structure = await userArgument.run(arg, possible, message);
					users.push(structure);
					i++;
				} catch {
					try {
						const structure: TextChannel = await textChannelArgument.run(arg, possible, message);
						if (structure.guild === message.guild) {
							channels.push(structure);
							i++;
						}
					} catch {
						continue;
					}
				}
			}

			const totalLength = users.length + channels.length;

			args.push(rest.splice(0, totalLength).join(usageDelim!), ...rest);
			if ((min && totalLength < min) || !totalLength) throw message.language.get(`RESOLVER_MULTI_TOO_FEW`, `${userArgument.name} or ${textChannelArgument.name}`, min);
			return [users, channels];
		});
	}

	get userArgument() {
		return this.client.arguments.get('user')!;
	}

	get textChannelArgument() {
		return this.client.arguments.get('textChannel')!;
	}

	private async _fetchTag(id: string | User) {
		try {
			const user = id instanceof User ? id : await this.client.users.fetch(id);
			return `${user.tag} — ${user.id}`;
		} catch {
			return `Unknown User#0000 — ${id}`;
		}
	}
}
