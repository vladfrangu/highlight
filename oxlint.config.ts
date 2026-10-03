import common from 'eslint-config-neon/oxlint/common';
import commonJsPlugins from 'eslint-config-neon/oxlint/common.jsplugins';
import node from 'eslint-config-neon/oxlint/node';
import prettier from 'eslint-config-neon/oxlint/prettier';
import prettierJsPlugins from 'eslint-config-neon/oxlint/prettier.jsplugins';
import typescript from 'eslint-config-neon/oxlint/typescript';
import typescriptJsPlugins from 'eslint-config-neon/oxlint/typescript.jsplugins';
import { defineConfig, type OxlintConfig } from 'oxlint';

// tsdoc/syntax was already disabled here, react and vue are not used
const droppedJsPlugins = ['@neon/eslint-react', '@neon/eslint-tsdoc', '@neon/eslint-vue'];

function keepRules(rules: OxlintConfig['rules']) {
	return Object.fromEntries(
		Object.entries(rules ?? {}).filter(
			([name]) => !droppedJsPlugins.some((plugin) => name.startsWith(`${plugin}/`)),
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
		withoutDroppedJsPlugins(typescriptJsPlugins),
		prettier,
		withoutDroppedJsPlugins(prettierJsPlugins),
	],
	ignorePatterns: ['dist/**', 'coverage/**', 'src.old/**'],
	options: { typeAware: true, reportUnusedDisableDirectives: 'warn' },
	rules: {
		'typescript/consistent-type-definitions': ['error', 'interface'],
		'typescript/dot-notation': 'off',
	},
});
