const { Monitor, Stopwatch, util: { regExpEsc } } = require("klasa");

module.exports = class extends Monitor {
	constructor (...args) {
		super(...args);
		this.prefixes = new Map();
		this.prefixMention = null;
		this.prefixMentionLength = null;
		this.nick = new RegExp("^<@!");
	}

	async run (msg) {
		if (this.client.user.bot && msg.guild && !msg.guild.me) await msg.guild.members.fetch(this.client.user);
		if (msg.guild && !msg.channel.postable) return;
		if (msg.content === this.client.user.toString() || (msg.guild && msg.content === msg.guild.me.toString())) {
			msg.send({
				embed: {
					color: 0x3669FA,
					title: `Hi!`,
					description: `I'm **${this.client.user.tag}**!\n\nRun **${msg.guild.me.toString()} help** to see what commands I have!`,
					thumbnail: {
						url: this.client.user.displayAvatarURL(),
					},
				},
			});
			return;
		}

		const { command, prefix, prefixLength } = this.parseCommand(msg);
		if (!command) return;

		const validCommand = this.client.commands.get(command);
		if (!validCommand) {
			if (this.client.listenerCount("commandUnknown")) this.client.emit("commandUnknown", msg, command);
			return;
		}

		const timer = new Stopwatch();
		if (this.client.options.typing) msg.channel.startTyping();
		msg._registerCommand({ command: validCommand, prefix, prefixLength });

		try {
			await this.client.inhibitors.run(msg, validCommand);
		} catch (response) {
			if (this.client.options.typing) msg.channel.stopTyping();
			this.client.emit("commandInhibited", msg, validCommand, response);
			return;
		}

		this.runCommand(msg, timer);
	}

	parseCommand (msg) {
		const { regex: prefix, length: prefixLength } = this.getPrefix(msg);
		if (!prefix) return { command: false };
		return {
			command: msg.content.slice(prefixLength).trim().split(" ")[0].toLowerCase(),
			prefix,
			prefixLength,
		};
	}

	getPrefix (msg) {
		if (this.prefixMention.test(msg.content))
			return { length: this.nick.test(msg.content) ? this.prefixMentionLength + 1 : this.prefixMentionLength, regex: this.prefixMention };
		return { prefix: null };
	}

	generateNewPrefix (prefix) {
		const prefixObject = { length: prefix.length, regex: new RegExp(`^${regExpEsc(prefix)}`) };
		this.prefixes.set(prefix, prefixObject);
		return prefixObject;
	}

	async runCommand (msg, timer) {
		try {
			await msg.prompter.run();
		} catch (error) {
			if (this.client.options.typing) msg.channel.stopTyping();
			return this.client.emit("commandError", msg, msg.command, msg.params, error);
		}

		const subcommand = msg.command.subcommands ? msg.params.shift() : undefined;
		const commandRun = subcommand ? msg.command[subcommand](msg, msg.params) : msg.command.run(msg, msg.params);

		if (this.client.options.typing) msg.channel.stopTyping();
		timer.stop();

		try {
			const mes = await commandRun;
			await this.client.finalizers.run(msg, mes, timer);
			return this.client.emit("commandSuccess", msg, msg.command, msg.params, mes);
		} catch (error) {
			return this.client.emit("commandError", msg, msg.command, msg.params, error);
		}
	}

	init () {
		this.ignoreSelf = this.client.user.bot;
		this.ignoreOthers = !this.client.user.bot;
		this.ignoreEdits = !this.client.options.cmdEditing;
		this.prefixMention = new RegExp(`^<@!?${this.client.user.id}>`);
		this.prefixMentionLength = this.client.user.id.length + 3;
	}
};
