import { none, some } from '@sapphire/framework';
import { createCustomIdFactory } from '#utils/customIds';

export const GloballyIgnoredUsersClearIdFactory = createCustomIdFactory({
	prefix: 'globally_ignored_users.clear:',
	decoder(id) {
		const split = id.split(':');

		if (split.length !== 2) {
			return none;
		}

		const [action, userId] = split;

		return some({ action: Number.parseInt(action, 10) as GloballyIgnoredUsersClearCustomIdActions, userId });
	},
	encoder(prefix, data) {
		return some(`${prefix}${data.action}:${data.userId}`);
	},
});

export const enum GloballyIgnoredUsersClearCustomIdActions {
	Confirm,
	Reject,
}
