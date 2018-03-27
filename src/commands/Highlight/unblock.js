const { Command } = require("klasa");
const { User } = require("discord.js");

module.exports = class extends Command {
	constructor (...args) {
		super(...args, {
			runIn: ["text"],
			description: "Unblock a channel or a member from the highlight block",
			usage: "<User:user|TextChannel:channel>",
			aliases: ["unblacklist"],
		});
		this.needsMember = true;
	}

	async run (msg, [userOrChannel]) {
		return userOrChannel instanceof User ? this._unblockUser(msg, userOrChannel) : this._unblockChannel(msg, userOrChannel);
	}

	async _unblockUser (msg, user) {
		if (msg.member.configs.blacklistedUsers) {
			if (!msg.member.configs.blacklistedUsers.includes(user.id)) {
				return msg.send(null, {
					embed: {
						color: 0xCC0F16,
						description: `That user isn't blacklisted!`,
					},
				});
			}
		}
		await msg.member.configs.update("blacklistedUsers", user, { action: "remove" });
		return msg.send(null, {
			embed: {
				color: 0x43B581,
				description: `Done! **${user.tag}** has been removed from your blocklist.`,
			},
		});
	}

	async _unblockChannel (msg, channel) {
		if (msg.member.configs.blacklistedChannels) {
			if (!msg.member.configs.blacklistedChannels.includes(channel.id)) {
				return msg.send(null, {
					embed: {
						color: 0xCC0F16,
						description: `That channel isn't blacklisted!`,
					},
				});
			}
		}
		await msg.member.configs.update("blacklistedChannels", channel, { action: "remove" });
		return msg.send(null, {
			embed: {
				color: 0x43B581,
				description: `Done! **#${channel.name}** has been removed from your blocklist.`,
			},
		});
	}
};

