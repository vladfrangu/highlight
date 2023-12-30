import { createCustomIdFactory } from '#utils/customIds';
import { none, some } from '@sapphire/framework';

export const ServerIgnoreListClearIdFactory = createCustomIdFactory({
	prefix: 'server_ignore_list.clear:',
	decoder(id) {
		const split = id.split(':');

		if (split.length !== 2) {
			return none;
		}

		const [action, userId] = split;

		return some({ action: parseInt(action, 10) as ServerIgnoreListClearCustomIdActions, userId });
	},
	encoder(prefix, data) {
		return some(`${prefix}${data.action}:${data.userId}`);
	},
});

export const enum ServerIgnoreListClearCustomIdActions {
	Confirm,
	Reject,
}
