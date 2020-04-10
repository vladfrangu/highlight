/*
 * Copyright 2019-2020 Antonio Román
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { codeBlock, isThenable, sleep, clean } from '@klasa/utils';
import { Command, CommandOptions, KlasaMessage, Stopwatch, Type } from 'klasa';
import { ApplyOptions } from '@skyra/decorators';
import { inspect } from 'util';
import fetch from 'node-fetch';

@ApplyOptions<CommandOptions>({
	aliases: ['ev'],
	description: 'Evaluates an expression',
	flagSupport: true,
	guarded: true,
	permissionLevel: 10,
	usage: '<expression:str>',
})
export default class extends Command {
	private readonly _timeout = 60000;

	async run(message: KlasaMessage, [code]: [string]) {
		const flagTime = 'no-timeout' in message.flagArgs ? 'wait' in message.flagArgs ? Number(message.flagArgs.wait) : this._timeout : Infinity;
		const language = message.flagArgs.lang || message.flagArgs.language || (message.flagArgs.json ? 'json' : 'js');
		const { success, result, time, type } = await this._timedEval(message, code, flagTime);

		if (message.flagArgs.silent) {
			if (!success && result && (result as unknown as Error).stack) this.client.emit('wtf', (result as unknown as Error).stack);
			return null;
		}

		const footer = codeBlock('ts', type);
		const sendAs = message.flagArgs.output || message.flagArgs['output-to'] || (message.flagArgs.log ? 'log' : null);
		return this._handleMessage(message, { sendAs, hastebinUnavailable: false, url: null }, { success, result, time, footer, language });
	}

	private _timedEval(message: KlasaMessage, code: string, flagTime: number) {
		if (flagTime === Infinity || flagTime === 0) return this._eval(message, code);
		return Promise.race([
			sleep(flagTime).then(() => ({
				result: `TIMEOUT: Took longer than ${flagTime / 1000} seconds.`,
				success: false,
				time: '⏱ ...',
				type: 'EvalTimeoutError',
			})),
			this._eval(message, code),
		]);
	}

	// Eval the input
	private async _eval(message: KlasaMessage, code: string) {
		const stopwatch = new Stopwatch();
		let success: boolean;
		let syncTime: string;
		let asyncTime: string;
		let result: unknown;
		let thenable = false;
		let type: Type;
		try {
			if (message.flagArgs.async) code = `(async () => {\n${code}\n})();`;
			// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
			// @ts-ignore 6133
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const msg = message;
			// eslint-disable-next-line no-eval
			result = eval(code);
			syncTime = stopwatch.toString();
			type = new Type(result);
			if (isThenable(result)) {
				thenable = true;
				stopwatch.restart();
				// eslint-disable-next-line @typescript-eslint/await-thenable
				result = await result;
				asyncTime = stopwatch.toString();
			}
			success = true;
		} catch (error) {
			if (!syncTime!) syncTime = stopwatch.toString();
			if (thenable && !asyncTime!) asyncTime = stopwatch.toString();
			if (!type!) type = new Type(error);
			result = error;
			success = false;
		}

		stopwatch.stop();
		if (typeof result !== 'string') {
			result = result instanceof Error ?
				result.stack :
				message.flagArgs.json ?
					JSON.stringify(result, null, 4) :
					inspect(result, {
						depth: message.flagArgs.depth ? parseInt(message.flagArgs.depth) || 0 : 0,
						showHidden: Boolean(message.flagArgs.showHidden),
					});
		}
		return { success, type: type!, time: this._formatTime(syncTime!, asyncTime!), result: clean(result as string) };
	}

	private _formatTime(syncTime: string, asyncTime: string) {
		return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
	}

	private async _getHaste(evalResult: string, language = 'js') {
		const { key } = await fetch('https://hasteb.in/documents', { method: 'post', body: evalResult }).then((res) => res.json()) as { key: string };
		return `https://hasteb.in/${key}.${language}`;
	}

	private async _handleMessage(message: KlasaMessage, options: InternalEvalOptions, { success, result, time, footer, language }: InternalEvalResults): Promise<KlasaMessage | KlasaMessage[] | null> {
		switch (options.sendAs) {
			case 'file': {
				if (message.channel.attachable) return message.channel.sendFile(Buffer.from(result), 'output.txt', `Sent the result as a file.\n**Type**:${footer}\n${time}`);
				await this._getTypeOutput(message, options);
				return this._handleMessage(message, options, { success, result, time, footer, language });
			}
			case 'haste':
			case 'hastebin': {
				// eslint-disable-next-line require-atomic-updates
				if (!options.url) options.url = await this._getHaste(result, language).catch(() => null);
				if (options.url) return message.send(`Sent the result to Hasteb.in: ${options.url}\n**Type**:${footer}\n${time}`);
				// eslint-disable-next-line require-atomic-updates
				options.hastebinUnavailable = true;
				await this._getTypeOutput(message, options);
				return this._handleMessage(message, options, { success, result, time, footer, language });
			}
			case 'console':
			case 'log': {
				this.client.emit('log', result);
				return message.send(`Sent the result to console.\n**Type**:${footer}\n${time}`);
			}
			case 'abort':
			case 'none':
				return null;
			default: {
				if (result.length > 2000) {
					await this._getTypeOutput(message, options);
					return this._handleMessage(message, options, { success, result, time, footer, language });
				}
				return message.sendMessage(message.language.get(success ? 'COMMAND_EVAL_OUTPUT' : 'COMMAND_EVAL_ERROR',
					time, codeBlock(language, result), footer));
			}
		}
	}

	private async _getTypeOutput(message: KlasaMessage, options: InternalEvalOptions) {
		const _options = ['none', 'abort', 'log'];
		if (message.channel.attachable) _options.push('file');
		if (!options.hastebinUnavailable) _options.push('hastebin');
		let _choice: { content: string };
		do
			_choice = await message.prompt(`Choose one of the following options: ${_options.join(', ')}`).catch(() => ({ content: 'none' }));
		while (!_options.concat('none', 'abort').includes(_choice.content));
		// eslint-disable-next-line require-atomic-updates
		options.sendAs = _choice.content.toLowerCase();
	}
}

interface InternalEvalResults {
	success: boolean;
	result: string;
	time: string;
	footer: string;
	language: string;
}

interface InternalEvalOptions {
	sendAs: string | null;
	hastebinUnavailable: boolean;
	url: string | null;
}
