import common from 'eslint-config-neon/oxlint/common';
import commonJsPlugins from 'eslint-config-neon/oxlint/common.jsplugins';
import node from 'eslint-config-neon/oxlint/node';
import prettier from 'eslint-config-neon/oxlint/prettier';
import prettierJsPlugins from 'eslint-config-neon/oxlint/prettier.jsplugins';
import typescript from 'eslint-config-neon/oxlint/typescript';
import { defineConfig, type OxlintConfig } from 'oxlint';

// typescript.jsplugins is not extended at all: sonarjs needs the TypeScript JS API, which TypeScript 7
// no longer ships, perfectionist replaces typescript-sort-keys, and prettier turns off its stylistic rules.
// import-x only has rules scoped to `**/*.oxlint-disabled`, react and vue are not used.
const droppedJsPlugins = ['@neon/eslint-import-x', '@neon/eslint-react', '@neon/eslint-vue'];

// oxlint has these natively, they are enabled in `rules` below.
const droppedJsRules = ['@neon/eslint-unicorn/no-named-default', '@neon/eslint-unicorn/prefer-export-from'];

const sortOptions = { type: 'alphabetical', order: 'asc', ignoreCase: false };

function keepRules(rules: OxlintConfig['rules']) {
	return Object.fromEntries(
		Object.entries(rules ?? {}).filter(
			([name]) =>
				!droppedJsRules.includes(name) && !droppedJsPlugins.some((plugin) => name.startsWith(`${plugin}/`)),
		),
	);
}

function withoutDroppedJsPlugins(config: OxlintConfig): OxlintConfig {
	return {
		...config,
		jsPlugins: config.jsPlugins?.filter(
			(plugin) => typeof plugin === 'string' || !droppedJsPlugins.includes(plugin.name),
		),
		rules: keepRules(config.rules),
		overrides: config.overrides?.map((override) => ({ ...override, rules: keepRules(override.rules) })),
	};
}

export default defineConfig({
	extends: [
		common,
		withoutDroppedJsPlugins(commonJsPlugins),
		node,
		typescript,
		prettier,
		withoutDroppedJsPlugins(prettierJsPlugins),
	],
	ignorePatterns: ['dist/**', 'coverage/**', 'src.old/**', 'src/lib/generated/**'],
	options: { typeAware: true, reportUnusedDisableDirectives: 'warn' },
	jsPlugins: ['eslint-plugin-perfectionist'],
	rules: {
		'id-length': ['error', { exceptions: ['_', '$', 'a', 'b', 'v', 'x', 'y', 'T', 'K'], min: 2 }],
		'import/no-named-default': 'error',
		'perfectionist/sort-enums': ['error', sortOptions],
		'perfectionist/sort-interfaces': ['error', sortOptions],
		'typescript/consistent-type-definitions': ['error', 'interface'],
		'typescript/dot-notation': 'off',
		'unicorn/prefer-export-from': 'error',
	},
});
