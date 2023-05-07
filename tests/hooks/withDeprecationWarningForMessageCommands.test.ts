import { createInfoEmbed } from '#utils/embeds';
import { MessageLimits } from '@sapphire/discord-utilities';
import { deepClone } from '@sapphire/utilities';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	OAuth2Routes,
	OAuth2Scopes,
	PermissionFlagsBits,
	PermissionsBitField,
	StringSelectMenuBuilder,
	bold,
	hyperlink,
	inlineCode,
	type MessageActionRowComponentBuilder,
} from 'discord.js';

vi.mock('@sapphire/framework', async () => {
	const actual = (await vi.importActual('@sapphire/framework')) as typeof import('@sapphire/framework');
	return {
		...actual,
		container: {
			client: {
				generateInvite: vi.fn(
					(
						options: Parameters<import('discord.js').Client['generateInvite']>[0] = {
							scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
						},
					) => {
						const query = new URLSearchParams({
							client_id: '1',
							scope: options.scopes.join(' '),
						});

						if (options.permissions) {
							const resolved = PermissionsBitField.resolve(options.permissions);
							if (resolved) {
								query.set('permissions', resolved.toString());
							}
						}

						if (options.guild) {
							query.set('guild_id', options.guild as string);
						}

						return `${OAuth2Routes.authorizationURL}?${query.toString()}`;
					},
				),
			},
		},
	};
});

afterAll(() => {
	vi.unmock('@sapphire/framework');
});

const { container } = await import('@sapphire/framework');
const { withDeprecationWarningForMessageCommands, withDeprecationWarningOnEmbedForMessageCommands } = await import(
	'#hooks/withDeprecationWarningForMessageCommands'
);

const invite = container.client.generateInvite({
	scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
	permissions: new PermissionsBitField([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.ReadMessageHistory,
		PermissionFlagsBits.SendMessages,
		PermissionFlagsBits.EmbedLinks,
	]),
	guild: '1',
});

const authButton = new ButtonBuilder()
	.setStyle(ButtonStyle.Link)
	.setURL(invite)
	.setLabel('Re-authorize me with slash commands!')
	.setEmoji('🤖');

describe('message command deprecation hooks', () => {
	describe('withDeprecationWarningOnEmbedForMessageCommands', () => {
		describe('given embed with too many fields, then it should update the description', () => {
			const twentyFiveFields = () => Array.from({ length: 25 }, () => ({ name: 'example', value: 'owo' }));

			test('given no button notice, it should just warn about the migration', () => {
				const embed = createInfoEmbed().setFields(twentyFiveFields());
				withDeprecationWarningOnEmbedForMessageCommands(embed, 'test');

				expect(embed.data.description).toEqual(
					[
						`> ${bold('Did you know?')}`,
						`> Message based commands are ${bold('deprecated')}, and will be removed in the future.`,
						`> You should use the ${bold(inlineCode(`/test`))} slash command instead!`,
					].join('\n'),
				);
			});

			test('given button notice, it should warn about the migration and link in the event of missing components', () => {
				const embed = createInfoEmbed().setFields(twentyFiveFields());
				withDeprecationWarningOnEmbedForMessageCommands(embed, 'test', invite);

				expect(embed.data.description).toEqual(
					[
						`> ${bold('Did you know?')}`,
						`> Message based commands are ${bold('deprecated')}, and will be removed in the future.`,
						`> You should use the ${bold(inlineCode(`/test`))} slash command instead!`,
						`> If you don't see the slash commands popping up when you type ${bold(
							inlineCode(`/test`),
						)}, click the ${bold('Re-authorize')} button if present (or click ${bold(
							hyperlink('here to re-authorize', invite),
						)}) and try again!`,
					].join('\n'),
				);
			});

			test('given embed with existing description, it should append the warning to the description', () => {
				const embed = createInfoEmbed('Hey there!').setFields(twentyFiveFields());
				withDeprecationWarningOnEmbedForMessageCommands(embed, 'test');

				expect(embed.data.description).toEqual(
					[
						'Hey there!',
						'',
						`> ${bold('Did you know?')}`,
						`> Message based commands are ${bold('deprecated')}, and will be removed in the future.`,
						`> You should use the ${bold(inlineCode(`/test`))} slash command instead!`,
					].join('\n'),
				);
			});
		});

		describe('given embed with enough space for a field, then it should add a field about the migration', () => {
			test('given no button notice, it should just warn about the migration', () => {
				const embed = createInfoEmbed();
				withDeprecationWarningOnEmbedForMessageCommands(embed, 'test');

				expect(embed.data.fields).toHaveLength(1);
				expect(embed.data.fields![0].name).toEqual('Did you know?');
				expect(embed.data.fields![0].value).toEqual(
					[
						`Message based commands are ${bold('deprecated')}, and will be removed in the future.`,
						`You should use the ${bold(inlineCode(`/test`))} slash command instead!`,
					].join('\n'),
				);
			});

			test('given button notice, it should warn about the migration and link in the event of missing components', () => {
				const embed = createInfoEmbed();
				withDeprecationWarningOnEmbedForMessageCommands(embed, 'test', invite);

				expect(embed.data.fields).toHaveLength(1);
				expect(embed.data.fields![0].name).toEqual('Did you know?');
				expect(embed.data.fields![0].value).toEqual(
					[
						`Message based commands are ${bold('deprecated')}, and will be removed in the future.`,
						`You should use the ${bold(inlineCode(`/test`))} slash command instead!`,
						`If you don't see the slash commands popping up when you type ${bold(
							inlineCode(`/test`),
						)}, click the ${bold('Re-authorize')} button if present (or click ${bold(
							hyperlink('here to re-authorize', invite),
						)}) and try again!`,
					].join('\n'),
				);
			});
		});
	});

	describe('withDeprecationWarningForMessageCommands', () => {
		test('given options received from an interaction, then it should return the exact same data', () => {
			const original = { content: 'hi' };

			const result = withDeprecationWarningForMessageCommands({
				commandName: 'test',
				guildId: '1',
				options: deepClone(original),
				receivedFromMessage: false,
			});

			expect(result).toStrictEqual(original);
		});

		describe('given options received from a message, then it should return the data with extra information about the deprecation', () => {
			test('given only content, it should add an embed and button', () => {
				const original = { content: 'Hi' };

				const result = withDeprecationWarningForMessageCommands({
					commandName: 'test',
					guildId: '1',
					options: deepClone(original),
					receivedFromMessage: true,
				});

				const expected = {
					...original,
					embeds: [withDeprecationWarningOnEmbedForMessageCommands(createInfoEmbed(), 'test', invite)],
					components: [new ActionRowBuilder().addComponents(authButton)],
				};

				expect(result).toEqual(expected);
			});

			test('given an embed, it should enhance it with the deprecation warning', () => {
				const original = { embeds: [EmbedBuilder.from(createInfoEmbed('Hey there!'))] };

				const result = withDeprecationWarningForMessageCommands({
					commandName: 'test',
					guildId: '1',
					options: deepClone(original),
					receivedFromMessage: true,
				});

				const expected = {
					embeds: [withDeprecationWarningOnEmbedForMessageCommands(original.embeds[0], 'test', invite)],
					components: [new ActionRowBuilder().addComponents(authButton)],
				};

				expect(result).toEqual(expected);
			});

			test('given content and an action row, it should add another action row', () => {
				const original = { content: 'Hi', components: [new ActionRowBuilder<MessageActionRowComponentBuilder>()] };

				const result = withDeprecationWarningForMessageCommands({
					commandName: 'test',
					guildId: '1',
					options: deepClone(original),
					receivedFromMessage: true,
				});

				const expected = {
					...original,
					embeds: [withDeprecationWarningOnEmbedForMessageCommands(createInfoEmbed(), 'test', invite)],
					components: [...original.components, new ActionRowBuilder().addComponents(authButton)],
				};

				expect(result).toEqual(expected);
			});

			test('given content and maximum action rows, it should add the auth button on the first available action row', () => {
				const original = {
					content: 'Hi',
					components: Array.from(
						{ length: MessageLimits.MaximumActionRows },
						() => new ActionRowBuilder<MessageActionRowComponentBuilder>(),
					),
				};

				const result = withDeprecationWarningForMessageCommands({
					commandName: 'test',
					guildId: '1',
					options: deepClone(original),
					receivedFromMessage: true,
				});

				const expected = {
					content: 'Hi',
					embeds: [withDeprecationWarningOnEmbedForMessageCommands(createInfoEmbed(), 'test', invite)],
					components: [...original.components],
				};

				// Add the button to the "first" free row
				expected.components[0].addComponents(authButton);

				expect(result).toStrictEqual(expected);
			});

			test('given content and maximum action rows, where some have select menus, it should add the auth button on the first available action row', () => {
				const original = {
					content: 'Hi',
					components: Array.from({ length: MessageLimits.MaximumActionRows }, (_, index) => {
						const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

						// Even rows get a select menu
						if (index % 2 === 0) {
							row.setComponents(new StringSelectMenuBuilder());
						}

						return row;
					}),
				};

				const result = withDeprecationWarningForMessageCommands({
					commandName: 'test',
					guildId: '1',
					options: deepClone(original),
					receivedFromMessage: true,
				});

				const expected = {
					content: 'Hi',
					embeds: [withDeprecationWarningOnEmbedForMessageCommands(createInfoEmbed(), 'test', invite)],
					components: [...original.components],
				};

				// Add the button to the "first" free row
				expected.components[1].addComponents(authButton);

				expect(result).toStrictEqual(expected);
			});
		});
	});
});
