import { createCustomIdFactory } from '#utils/customIds';
import { none, some } from '@sapphire/framework';

describe('custom id helper with custom encoder/decoder', () => {
	const test = createCustomIdFactory({
		prefix: 'server_ignore_list_clear:',
		decoder(id) {
			const split = id.split(':');

			if (split.length !== 2) {
				return none;
			}

			const [action, userId] = split;

			return some({ action, userId });
		},
		encoder(prefix, data) {
			return some(`${prefix}${data.action}:${data.userId}`);
		},
	});

	it('should encode and decode data', () => {
		const encoded = test.encodeId({ action: 'clear', userId: '1234' });
		expect(encoded.isNone()).toBe(false);
		expect(encoded.unwrap()).toBe('server_ignore_list_clear:clear:1234');

		const decoded = test.decodeId('server_ignore_list_clear:clear:1234');
		expect(decoded.isNone()).toBe(false);
		expect(decoded.unwrap()).toEqual({ action: 'clear', userId: '1234' });
	});

	it('should not decode invalid id', () => {
		const decoded = test.decodeId('server_ignore_list_clear:clear');

		expect(decoded.isNone()).toBe(true);
	});
});

describe('custom id helper with default encoder/decoder', () => {
	const test = createCustomIdFactory({
		prefix: 'server_ignore_list_clear:',
	});

	it('should encode and decode data', () => {
		const encoded = test.encodeId('1234');
		expect(encoded.isNone()).toBe(false);
		expect(encoded.unwrap()).toBe('server_ignore_list_clear:1234');

		const decoded = test.decodeId('server_ignore_list_clear:1234');
		expect(decoded.isNone()).toBe(false);
		expect(decoded.unwrap()).toBe('1234');
	});

	it('should not decode invalid id', () => {
		const decoded = test.decodeId('server_ignore_list_clearnt:clear');

		expect(decoded.isNone()).toBe(true);
	});
});
