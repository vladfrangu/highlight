import { WebhookClient } from 'discord.js';

let webhookInstance: WebhookClient = null!;

export function useErrorWebhook() {
	webhookInstance ??= new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL! });

	return webhookInstance;
}
