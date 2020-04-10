import { Command, CommandOptions, KlasaMessage, util } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { MessageAttachment } from 'discord.js';
import fetch from 'node-fetch';

@ApplyOptions<CommandOptions>({
	aliases: ['execute'],
	description: 'Executes a shell script',
	flagSupport: true,
	guarded: true,
	permissionLevel: 10,
	usage: '<expression:string>',
})
export default class extends Command {
	async run(message: KlasaMessage, [input]: [string]) {
		const result = await util.exec(input, { timeout: 'timeout' in message.flagArgs ? Number(message.flagArgs.timeout) : 60000 })
			.catch((error) => ({ stdout: null, stderr: error }));
		const output = result.stdout ? `**\`OUTPUT\`**${util.codeBlock('prolog', result.stdout)}` : '';
		const outerr = result.stderr ? `**\`ERROR\`**${util.codeBlock('prolog', result.stderr)}` : '';
		const joined = [output, outerr].join('\n') || 'No output';

		return message.sendMessage(joined.length > 2000 ? await this._getHaste(joined).catch(() => new MessageAttachment(Buffer.from(joined), 'output.txt')) : joined);
	}

	private async _getHaste(result: string) {
		const { key } = await fetch('https://hasteb.in/documents', { method: 'post', body: result }).then((res) => res.json()) as { key: string };
		return `https://hasteb.in/${key}.js`;
	}
}
