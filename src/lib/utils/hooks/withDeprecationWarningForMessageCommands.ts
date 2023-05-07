import { createInfoEmbed } from '#utils/embeds';
import { ActionRowBuilder, MessageActionRowComponentBuilder, bold, hyperlink, inlineCode } from '@discordjs/builders';
import { container } from '@sapphire/framework';
import { deepClone } from '@sapphire/utilities';
import { ButtonStyle, ComponentType, OAuth2Scopes, PermissionFlagsBits } from 'discord-api-types/v10';
import {
	ButtonBuilder,
	EmbedBuilder,
	InteractionReplyOptions,
	MessageCreateOptions,
	PermissionsBitField,
	WebhookMessageEditOptions,
} from 'discord.js';

export function withDeprecationWarningOnEmbedForMessageCommands(
	embed: EmbedBuilder,
	commandName: string,
	buttonNotice: string | null = null,
) {
	// Add it to the description
	if (embed.data.fields?.length === 25) {
		embed.setDescription(
			[
				embed.data.description ? embed.data.description : undefined,
				embed.data.description ? '' : undefined,
				`> ${bold('Did you know?')}`,
				`> Message based commands are ${bold('deprecated')}, and will be removed in the future.`,
				`> You should use the ${bold(inlineCode(`/${commandName}`))} slash command instead!`,
				buttonNotice
					? `> If you don't see the slash commands popping up when you type ${bold(
							inlineCode(`/${commandName}`),
					  )}, click the ${bold('Re-authorize')} button if present (or click ${bold(
							hyperlink('here to re-authorize', buttonNotice),
					  )}) and try again!`
					: undefined,
			]
				.filter((item) => typeof item === 'string')
				.join('\n'),
		);
	}
	// Add a field if we can
	else {
		embed.addFields({
			name: 'Did you know?',
			value: [
				`Message based commands are ${bold(
					'deprecated',
				)}, and will be removed in the future.\nYou should use the ${bold(
					inlineCode(`/${commandName}`),
				)} slash command instead!`,
				buttonNotice
					? `If you don't see the slash commands popping up when you type ${bold(
							inlineCode(`/${commandName}`),
					  )}, click the ${bold('Re-authorize')} button if present (or click ${bold(
							hyperlink('here to re-authorize', buttonNotice),
					  )}) and try again!`
					: undefined,
			]
				.filter((item) => typeof item === 'string')
				.join('\n'),
		});
	}

	return embed;
}

export function withDeprecationWarningForMessageCommands<
	T extends InteractionReplyOptions | MessageCreateOptions | WebhookMessageEditOptions,
>({
	options,
	commandName,
	receivedFromMessage,
	guildId,
}: {
	options: T;
	commandName: string;
	receivedFromMessage: boolean;
	guildId: string | null;
}) {
	// If we didn't get it from messages, might as well not do anything
	if (!receivedFromMessage) {
		return options;
	}

	const cloned = deepClone(options);

	const invite = container.client.generateInvite({
		scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
		permissions: new PermissionsBitField([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.ReadMessageHistory,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks,
		]),
		guild: guildId ?? undefined,
	});

	// If we have embeds, use the previous behavior
	if (cloned.embeds?.length) {
		const [first, ...rest] = cloned.embeds;

		cloned.embeds = [
			withDeprecationWarningOnEmbedForMessageCommands(EmbedBuilder.from(first), commandName, invite),
			...rest,
		];
	}
	// Create embed with the warning
	else {
		cloned.embeds = [withDeprecationWarningOnEmbedForMessageCommands(createInfoEmbed(), commandName, invite)];
	}

	const authButton = new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setURL(invite)
		.setLabel('Re-authorize me with slash commands!')
		.setEmoji('🤖');

	if (cloned.components?.length) {
		const casted = cloned.components as ActionRowBuilder<MessageActionRowComponentBuilder>[];
		// We have components. If we have 5 rows (unlikely), we cannot do anything but piggyback off of the first free row
		// Otherwise, we just push a new row
		if (casted.length === 5) {
			const freeRow = casted.find((row) => {
				return (
					row.components.length !== 5 &&
					![
						ComponentType.StringSelect,
						ComponentType.UserSelect,
						ComponentType.RoleSelect,
						ComponentType.MentionableSelect,
						ComponentType.ChannelSelect,
					].some((type) => row.components[0].data.type !== type)
				);
			});

			if (freeRow) {
				freeRow.components.push(authButton);
			}
		} else {
			cloned.components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(authButton));
		}
	}
	// We don't have any components, so we can just add a new one
	else {
		cloned.components = [new ActionRowBuilder<ButtonBuilder>().addComponents(authButton)];
	}

	return cloned;
}
