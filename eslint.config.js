import common from 'eslint-config-neon/flat/common.js';
import node from 'eslint-config-neon/flat/node.js';
import prettier from 'eslint-config-neon/flat/prettier.js';
import typescript from 'eslint-config-neon/flat/typescript.js';
import merge from 'lodash.merge';

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
				alphabetize: {
					caseInsensitive: false,
					order: 'asc',
				},
				groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				'newlines-between': 'never',
			},
		],
	},
	settings: {
		'import/resolver': {
			typescript: {
				project: ['tsconfig.eslint.json', 'tests/tsconfig.json'],
			},
		},
	},
});

const prettierRuleset = merge(...prettier, { files: [`**/*${commonFiles}`] });

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	{
		ignores: ['**/node_modules/', '.git/', '**/dist/', '**/coverage/'],
	},
	commonRuleset,
	nodeRuleset,
	typeScriptRuleset,
	{
		files: ['**/*{ts,mts,cts,tsx}'],
		rules: { 'jsdoc/no-undefined-types': 0 },
	},
	prettierRuleset,
];
