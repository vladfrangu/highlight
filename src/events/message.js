const { Event } = require('klasa');

module.exports = class extends Event {
	async run(msg) {
		if (msg.content.toLowerCase() === "highlight pls ss") return msg.channel.send("`SS` ~~--~~ Shorthand for **Screenshot**.\nIf someone says `Please take a ss`, they want a screenshot of what you're seeing!");
//		if (msg.content.toLowerCase() === "highlight nuker?" || msg.content.toLowerCase() === "h nuker?") return msg.channel.send("Click the link.\n\n<https://canary.discordapp.com/channels/339942739275677727/339944237305036812/465157099761041409>")
		if ((msg.content.toLowerCase() === ".bork" || msg.content.toLowerCase() === ".blep") && (msg.guild.id === "339376237560463360" || msg.guild.id === "444629538958213150")) {
			const borker = await this.client.users.fetch("293552473942261762");
			borker.send(`${msg.content.toLowerCase() === ".blep" ? "BLEP" : "BORK"} by ${msg.author.tag} in ${msg.channel}`);
			msg.react(msg.content.toLowerCase() === ".bork" ? "bork:450861231998500864" : Math.random() < 0.5 ? "jokerBLEP:464857497610747904" : "cheapBLEP:465853194015211520").catch(() => null);
			return;
		}
		if (msg.content.toLowerCase() === '.thonk') {
			msg.react('thonk:352878018840100866').catch(() => null);
			return;
		}
		if (msg.content.toLowerCase() === '.hecc') {
			msg.react('blobpout:466059369877078016').catch(() => null);
			return;
		}
		if (msg.content.toLowerCase() === ".soam") {
			const ima = await this.client.users.fetch("237372935214596097");
			ima.send(`SOAM received from ${msg.author.tag} in ${msg.channel}`);
			return;
		}
		if (msg.content.toLowerCase() === '.gay') {
			msg.react('gay:350267475373457412').catch(() => null);
			return;
		}
		if (this.client.ready) this.client.monitors.run(msg);
	}

};
