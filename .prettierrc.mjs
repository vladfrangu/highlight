import sapphirePrettierConfig from '@sapphire/prettier-config';

/** @type {import('prettier').Config} */
export default {
	...sapphirePrettierConfig,
	trailingComma: 'all',
	printWidth: 120,
	experimentalTernaries: true,
};
