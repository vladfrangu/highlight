const { Command } = require("klasa");
const { User } = require("discord.js");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Block a member or a channel from highlighting you",
			usage: "<User:user|TextChannel:channel>",
			aliases: ["blacklist"],
		});
		this.needsMember = true;
	}

	async run (msg, [userOrChannel]) {
		return userOrChannel instanceof User ? this._blockUser(msg, userOrChannel) : this._blockChannel(msg, userOrChannel);
	}

	async _blockUser (msg, user) {
		if (msg.member.configs.blacklistedUsers) {
			if (msg.member.configs.blacklistedUsers.includes(user.id)) {
				return msg.send(null, {
					embed: {
						color: 0xCC0F16,
						description: `That user is already blacklisted!`,
					},
				});
			}
		}
		await msg.member.configs.update("blacklistedUsers", user, { action: "add" });
		return msg.send(null, {
			embed: {
				color: 0x43B581,
				description: `Done! **${user.tag}** has been added to your blocklist.`,
			},
		});
	}

	async _blockChannel (msg, channel) {
		if (msg.member.configs.blacklistedChannels) {
			if (msg.member.configs.blacklistedChannels.includes(channel.id)) {
				return msg.send(null, {
					embed: {
						color: 0xCC0F16,
						description: `That channel is already blacklisted!`,
					},
				});
			}
		}
		await msg.member.configs.update("blacklistedChannels", channel, { action: "add" });
		return msg.send(null, {
			embed: {
				color: 0x43B581,
				description: `Done! **#${channel.name}** has been added to your blocklist.`,
			},
		});
	}
};
