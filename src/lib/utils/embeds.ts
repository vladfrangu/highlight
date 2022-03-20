import { MessageEmbed } from 'discord.js';

export function createInfoEmbed(description?: string) {
	return new MessageEmbed({ color: 0x3669fa, description });
}

export function createErrorEmbed(description?: string) {
	return new MessageEmbed({ color: 0xcc0f16, description });
}

export function createSuccessEmbed(description?: string) {
	return new MessageEmbed({ color: 0x43b581, description });
}
