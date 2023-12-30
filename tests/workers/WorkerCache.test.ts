import { GuildIds, testSubjectTriggerUserId, testSubjectUserId } from '#test/constants';
import { WorkerResponseTypes, WorkerType } from '#types/WorkerTypes';
import type { MockInstance } from 'vitest';

vi.mock('#workers/common', () => {
	return {
		checkParentPort: vi.fn(() => true),
		sendToMainProcess: vi.fn(() => void 0),
	};
});

const { WorkerCache } = await import('#workers/WorkerCache');
const { sendToMainProcess } = await import('#workers/common');

const sendToMainProcessSpy = vitest.mocked(sendToMainProcess);

describe('WorkerCache', () => {
	const cache = new WorkerCache();
	const removeTriggerForUserSpy = vi.spyOn(cache, 'removeTriggerForUser');

	afterEach(() => {
		cache['guildMap'].clear();
	});

	describe('removeTriggerForUser', () => {
		test("given invalid guild it it shouldn't remove anything", () => {
			cache.removeTriggerForUser({
				guildId: String(GuildIds.NothingGuild),
				memberId: testSubjectUserId,
				trigger: 'test',
			});

			expect(removeTriggerForUserSpy).toReturn();
		});

		test("given invalid trigger for guild it shouldn't remove anything", () => {
			cache.updateGuild(String(GuildIds.WordGuild), new Map([['test', new Set([testSubjectUserId])]]));

			cache.removeTriggerForUser({
				guildId: String(GuildIds.WordGuild),
				memberId: testSubjectUserId,
				trigger: 'test2',
			});

			expect(removeTriggerForUserSpy).toReturn();
		});
	});

	describe('Regular expression tests', () => {
		test('should return false if the regular expression is invalid', () => {
			expect(cache.isRegularExpressionValid('[')).toBe(false);
		});

		test('should return true if the regular expression is valid', () => {
			expect(cache.isRegularExpressionValid('[a-z]')).toBe(true);
		});

		test('should have cached the provided regular expressions and subsequent calls should return cached value', () => {
			const cachedExpressions = cache['validRegularExpressions'];
			const setValidRegexSpy = vi.spyOn(cache, 'setValidRegex' as any) as MockInstance<
				[],
				[regex: string, valid: boolean]
			>;

			expect(cachedExpressions.size).toBe(2);
			expect(cachedExpressions.get('[a-z]')).toBe(true);
			expect(cachedExpressions.get('[')).toBe(false);

			// Check caching
			expect(cache.isRegularExpressionValid('[a-z]')).toBe(true);
			expect(setValidRegexSpy).not.toHaveBeenCalled();

			setValidRegexSpy.mockRestore();
		});
	});

	describe('highlight parsing', () => {
		beforeEach(() => {
			cache.updateGuild(String(GuildIds.WordGuild), new Map([['word', new Set([testSubjectUserId])]]));
			cache.updateGuild(String(GuildIds.RegExpGuild), new Map([['\\bword\\b', new Set([testSubjectUserId])]]));
			cache.updateGuild(String(GuildIds.InvalidRegExpGuild), new Map([['[a-z', new Set([testSubjectUserId])]]));
			cache.updateGuild(String(GuildIds.NothingGuild), new Map());
		});

		test.each([
			[WorkerType[WorkerType.Word], WorkerType.Word],
			[WorkerType[WorkerType.RegularExpression], WorkerType.RegularExpression],
		])('invalid guild id provided for %s (%p) returns no results', (_, workerType) => {
			const result = cache.parse(workerType, '999', testSubjectTriggerUserId, 'word');

			expect(result.results).toHaveLength(0);
		});

		test.each([
			[WorkerType[WorkerType.Word], WorkerType.Word, GuildIds[GuildIds.WordGuild], GuildIds.WordGuild],
			[
				WorkerType[WorkerType.RegularExpression],
				WorkerType.RegularExpression,
				GuildIds[GuildIds.RegExpGuild],
				GuildIds.RegExpGuild,
			],
		])(
			'parsing a %s (%p) sent by the author that expects highlights returns no results',
			(_, workerType, __, guildId) => {
				const result = cache.parse(workerType, String(guildId), testSubjectUserId, 'word');

				expect(result.results).toHaveLength(0);
			},
		);

		test.each([
			[WorkerType[WorkerType.Word], WorkerType.Word, GuildIds[GuildIds.WordGuild], GuildIds.WordGuild],
			[
				WorkerType[WorkerType.RegularExpression],
				WorkerType.RegularExpression,
				GuildIds[GuildIds.RegExpGuild],
				GuildIds.RegExpGuild,
			],
		])(
			"parsing a %s (%p) sent that doesn't match any registered data returns no results",
			(_, workerType, __, guildId) => {
				const result = cache.parse(workerType, String(guildId), testSubjectUserId, 'owo');

				expect(result.results).toHaveLength(0);
			},
		);

		test.each([
			[WorkerType[WorkerType.Word], WorkerType.Word, GuildIds[GuildIds.WordGuild], GuildIds.WordGuild],
			[
				WorkerType[WorkerType.RegularExpression],
				WorkerType.RegularExpression,
				GuildIds[GuildIds.RegExpGuild],
				GuildIds.RegExpGuild,
			],
		])(
			'parsing a valid %s (%p) for pre-registered guild %s (%p) should return valid data',
			(_, workerType, __, guildId) => {
				const { results, memberIds } = cache.parse(
					workerType,
					String(guildId),
					testSubjectTriggerUserId,
					'word',
				);

				expect(results).toHaveLength(1);
				expect(memberIds).toHaveLength(1);

				const [result] = results;

				expect(result.memberId).toBe(String(testSubjectUserId));
				expect(result.trigger).toBe(workerType === WorkerType.RegularExpression ? '\\bword\\b' : 'word');
				expect(result.parsedContent).toBe('**word**');
			},
		);

		test.each([
			[WorkerType[WorkerType.Word], WorkerType.Word, GuildIds[GuildIds.NothingGuild], GuildIds.NothingGuild],
			[
				WorkerType[WorkerType.RegularExpression],
				WorkerType.RegularExpression,
				GuildIds[GuildIds.NothingGuild],
				GuildIds.NothingGuild,
			],
		])(
			'parsing a valid %s (%p) for pre-registered guild %s (%p) should return no results',
			(_, workerType, __, guildId) => {
				const { results } = cache.parse(workerType, String(guildId), testSubjectTriggerUserId, 'word');

				expect(results).toHaveLength(0);
			},
		);

		test('parsing an invalid regular expression (1) for pre-registered guild InvalidRegExpGuild (3) should return no results and remove the trigger from the user', () => {
			const { results } = cache.parse(
				WorkerType.RegularExpression,
				String(GuildIds.InvalidRegExpGuild),
				testSubjectTriggerUserId,
				'word',
			);

			expect(results).toStrictEqual([]);
			expect(sendToMainProcessSpy).toHaveBeenCalledWith<Parameters<typeof sendToMainProcess>>({
				command: WorkerResponseTypes.DeleteInvalidRegularExpression,
				data: {
					guildId: String(GuildIds.InvalidRegExpGuild),
					memberId: testSubjectUserId,
					value: '[a-z',
				},
			});
			expect(removeTriggerForUserSpy).toHaveBeenCalledWith<Parameters<(typeof cache)['removeTriggerForUser']>>({
				guildId: String(GuildIds.InvalidRegExpGuild),
				memberId: testSubjectUserId,
				trigger: '[a-z',
			});
			expect(cache['guildMap'].get(String(GuildIds.InvalidRegExpGuild))).toBeUndefined();
		});
	});

	describe('parsed content for word triggers', () => {
		beforeEach(() => {
			cache.updateGuild(
				String(GuildIds.WordGuild),
				new Map([
					['word', new Set([testSubjectUserId])],
					['o', new Set([testSubjectUserId])],
					['help?', new Set([testSubjectUserId])],
				]),
			);
		});

		test.each(['word', 'o', 'help?'])('given %p then it should return bolded content', (trigger) => {
			const result = cache.parse(
				WorkerType.Word,
				String(GuildIds.WordGuild),
				testSubjectTriggerUserId,
				`hello ${trigger}`,
			);

			expect(result.results).toHaveLength(1);

			const [resultItem] = result.results;

			expect(resultItem.memberId).toBe(String(testSubjectUserId));
			expect(resultItem.trigger).toBe(trigger);
			expect(resultItem.parsedContent).toBe(`hello **${trigger}**`);
		});

		test.each(['word', 'o', 'help?'])(
			'given multiple mentions of %p then it should return bolded content',
			(trigger) => {
				const result = cache.parse(
					WorkerType.Word,
					String(GuildIds.WordGuild),
					testSubjectTriggerUserId,
					`hello ${trigger} ${trigger}`,
				);

				expect(result.results).toHaveLength(1);

				const [resultItem] = result.results;

				expect(resultItem.memberId).toBe(String(testSubjectUserId));
				expect(resultItem.trigger).toBe(trigger);
				expect(resultItem.parsedContent).toBe(`hello **${trigger}** **${trigger}**`);
			},
		);
	});

	describe('parsed content for regular expression triggers', () => {
		beforeEach(() => {
			cache.updateGuild(
				String(GuildIds.RegExpGuild),
				new Map([
					['word', new Set([testSubjectUserId])],
					['o', new Set([testSubjectUserId])],
					['help?', new Set([testSubjectUserId])],
					['\\s+', new Set([testSubjectUserId])],
				]),
			);
		});

		test.each([
			['word', 'word'],
			['o', 'o'],
			['help', 'help?'],
			['hel', 'help?'],
		])('given %p then it should return bolded content', (testCase, trigger) => {
			const result = cache.parse(
				WorkerType.RegularExpression,
				String(GuildIds.RegExpGuild),
				testSubjectTriggerUserId,
				`unrelated ${testCase}`,
			);

			expect(result.results).toHaveLength(1);

			const [resultItem] = result.results;

			expect(resultItem.memberId).toBe(String(testSubjectUserId));
			expect(resultItem.trigger).toBe(trigger);
			expect(resultItem.parsedContent).toBe(`unrelated **${testCase}**`);
		});

		test('given a pattern that matches a whitespace, it should replace all whitespaces with underlined whitespaces', () => {
			const result = cache.parse(
				WorkerType.RegularExpression,
				String(GuildIds.RegExpGuild),
				testSubjectTriggerUserId,
				`unrelated test`,
			);

			expect(result.results).toHaveLength(1);

			const [resultItem] = result.results;

			expect(resultItem.memberId).toBe(String(testSubjectUserId));
			expect(resultItem.trigger).toBe('\\s+');
			expect(resultItem.parsedContent).toBe(`unrelated__ __test`);

			const result2 = cache.parse(
				WorkerType.RegularExpression,
				String(GuildIds.RegExpGuild),
				testSubjectTriggerUserId,
				`unrelated test test test`,
			);

			expect(result2.results).toHaveLength(1);

			const [resultItem2] = result2.results;

			expect(resultItem2.memberId).toBe(String(testSubjectUserId));
			expect(resultItem2.trigger).toBe('\\s+');
			expect(resultItem2.parsedContent).toBe(`unrelated__ __test__ __test__ __test`);
		});
	});
});
