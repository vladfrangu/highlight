/**
 * The code has been altered to function in this bot. Below is the original license.
 * @license
 * MIT License
 *
 * Copyright (c) 2017-2018 `Antonio Roman`
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Channel, TextChannel, Util } from 'discord.js';
import { Task } from '../lib/schedule/tasks/Task';

// The header with the console colours
const HEADER = `\u001B[39m\u001B[94m[CACHE CLEANUP]\u001B[39m\u001B[90m`;

const THRESHOLD = 60_000 * 30;
const EPOCH = 1_420_070_400_000;
const EMPTY = '0000100000000000000000';

export default class extends Task {
	public run() {
		const { client } = this.context;

		const OLD_SNOWFLAKE = Util.binaryToID((Date.now() - THRESHOLD - EPOCH).toString(2).padStart(42, '0') + EMPTY);
		let presences = 0;
		let guildMembers = 0;
		let lastMessages = 0;
		let users = 0;

		// Per-Guild sweeper
		for (const guild of client.guilds.cache.values()) {
			// Clear presences
			presences += guild.presences.cache.size;
			guild.presences.cache.clear();

			// Clear members that haven't send a message in the last 30 minutes
			const { me } = guild;
			for (const [id, member] of guild.members.cache) {
				if (member === me) continue;
				if (member.voice.channelID) continue;
				if (member.lastMessageID && member.lastMessageID > OLD_SNOWFLAKE) continue;
				guild.members.cache.delete(id);
				guildMembers++;
			}
		}

		// Per-Channel sweeper
		for (const channel of client.channels.cache.values()) {
			if (this.isTextChannel(channel) && channel.lastMessageID) {
				channel.lastMessageID = null;
				lastMessages++;
			}
		}

		// Per-User sweeper
		for (const user of client.users.cache.values()) {
			if (user.lastMessageID && user.lastMessageID > OLD_SNOWFLAKE) continue;
			client.users.cache.delete(user.id);
			users++;
		}

		client.logger.info(
			`${HEADER} ${this.setColor(presences)} [Presence]s | ${this.setColor(
				guildMembers,
			)} [GuildMember]s | ${this.setColor(users)} [User]s | ${this.setColor(lastMessages)} [Last Message]s.`,
		);

		return null;
	}

	/**
	 * Set a color depending on the amount:
	 * > 1000 : Light Red color
	 * > 100  : Light Yellow color
	 * < 100  : Green color
	 * @param n The number to colorise
	 */
	private setColor(n: number) {
		const text = n.toLocaleString().padStart(5, ' ');
		// Light Red color
		if (n > 1000) return `\u001B[39m\u001B[91m${text}\u001B[39m\u001B[90m`;
		// Light Yellow color
		if (n > 100) return `\u001B[39m\u001B[93m${text}\u001B[39m\u001B[90m`;
		// Green color
		return `\u001B[39m\u001B[32m${text}\u001B[39m\u001B[90m`;
	}

	private isTextChannel(channel: Channel): channel is TextChannel {
		return channel.type === 'text';
	}
}
