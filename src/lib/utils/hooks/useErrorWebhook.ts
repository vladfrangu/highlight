import { envParseString } from '@skyra/env-utilities';
import { WebhookClient } from 'discord.js';

let webhookInstance: WebhookClient = null!;

export function useErrorWebhook() {
	webhookInstance ??= new WebhookClient({ url: envParseString('ERROR_WEBHOOK_URL') });

	return webhookInstance;
}
