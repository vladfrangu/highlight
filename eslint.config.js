import process from 'node:process';
import { setup } from '@skyra/env-utilities';
import safeql from '@ts-safeql/eslint-plugin/config';
import common from 'eslint-config-neon/flat/common.js';
import node from 'eslint-config-neon/flat/node.js';
import prettier from 'eslint-config-neon/flat/prettier.js';
import typescript from 'eslint-config-neon/flat/typescript.js';
import isCI from 'is-ci';
import merge from 'lodash.merge';

setup({ path: new URL('.env', import.meta.url) });

const commonFiles = '{js,mjs,cjs,ts,mts,cts,jsx,tsx}';

const commonRuleset = merge(...common, { files: [`**/*${commonFiles}`] });

const nodeRuleset = merge(...node, { files: [`**/*${commonFiles}`] });

const typeScriptRuleset = merge(...typescript, {
	files: [`**/*${commonFiles}`],
	languageOptions: {
		parserOptions: {
			warnOnUnsupportedTypeScriptVersion: false,
			allowAutomaticSingleRunInference: true,
			project: ['tsconfig.eslint.json'],
		},
	},
	rules: {
		'@typescript-eslint/consistent-type-definitions': [2, 'interface'],
		'@typescript-eslint/dot-notation': 0,
		'import/order': [
			1,
			{
				alphabetize: { caseInsensitive: false, order: 'asc' },
				groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				'newlines-between': 'never',
			},
		],
		'tsdoc/syntax': 0,
	},
	settings: { 'import/resolver': { typescript: { project: ['tsconfig.eslint.json', 'tests/tsconfig.json'] } } },
});

const prettierRuleset = merge(...prettier, { files: [`**/*${commonFiles}`] });

const url = new URL(process.env.POSTGRES_URL);
url.searchParams.delete('schema');

/** @type {import('eslint').Linter.FlatConfig} */
const safeqlRuleset = {
	...safeql.configs.connections({
		connectionUrl: url.toString(),
		migrationsDir: './prisma/migrations',
		targets: [{ tag: '**prisma.+($queryRaw|$executeRaw)', transform: '{type}[]' }],
		overrides: {},
	}),
	files: [`**/*${commonFiles}`],
	languageOptions: { parserOptions: { project: ['tsconfig.eslint.json'] } },
};

/** @type {import('eslint').Linter.FlatConfig[]} */
const rules = [
	{ ignores: ['**/node_modules/', '.git/', '**/dist/', '**/coverage/'] },
	commonRuleset,
	nodeRuleset,
	typeScriptRuleset,
	{ files: ['**/*{ts,mts,cts,tsx}'], rules: { 'jsdoc/no-undefined-types': 0 } },
	prettierRuleset,
];

if (!isCI) {
	rules.push(safeqlRuleset);
}

export default rules;
