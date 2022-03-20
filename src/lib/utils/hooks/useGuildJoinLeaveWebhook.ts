import { WebhookClient } from 'discord.js';

let webhookInstance: WebhookClient = null!;

export function useGuildJoinLeaveWebhook() {
	webhookInstance ??= new WebhookClient({ url: process.env.GUILD_JOIN_LEAVE_WEBHOOK_URL! });

	return webhookInstance;
}
