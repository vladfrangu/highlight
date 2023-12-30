import { Option, none, some } from '@sapphire/framework';

export interface CustomIdFactory<T> {
	encodeId(data: T): Option<string>;
	decodeId(id: string): Option<T>;
}

export interface CreateCustomIdFactoryOptions<T> {
	encoder?: (prefix: string, data: T) => Option<string>;
	decoder?: (id: string) => Option<T>;
	prefix: string;
}

export function createCustomIdFactory<T>(options: CreateCustomIdFactoryOptions<T>): CustomIdFactory<T> {
	return {
		encodeId(data) {
			if (options.encoder) {
				return options.encoder(options.prefix, data);
			}

			return some(`${options.prefix}${data}`);
		},
		decodeId(id) {
			if (!id.startsWith(options.prefix)) {
				return none;
			}

			if (options.decoder) {
				return options.decoder(id.slice(options.prefix.length));
			}

			return some(id.slice(options.prefix.length) as unknown as T);
		},
	};
}
