type DBProvider = 'json' | 'rethinkdb';

/**
 * The token for the bot
 */
export const token = '';

/**
 * The provider the bot should use for storing its data.
 *
 * Either `json` for JSON file storing, or `rethinkdb` for rethinkdb storage.
 *
 * If you want another database support, shoot a PR
 */
export const provider: DBProvider = 'rethinkdb';

/**
 * Rethinkdb options for the connection
 */
export const rethinkdb = {
	db: 'highlight',
	user: 'admin',
	password: '',
	pool: true,
	host: 'localhost',
	port: 28015,
	buffer: 100,
	max: 10000,
	timeoutGb: 10000,
	timeout: 10,
	silent: true,
};
