import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: [
			{ find: '#internals', replacement: resolve('src/lib/internals') },
			{ find: '#hooks', replacement: resolve('src/lib/utils/hooks') },
			{ find: '#setup', replacement: resolve('src/lib/utils/setup.ts') },
			{ find: '#types', replacement: resolve('src/lib/types') },
			{ find: '#utils', replacement: resolve('src/lib/utils') },
			{ find: '#workers', replacement: resolve('src/lib/workers') },
			{ find: '#test', replacement: resolve('tests/__shared__') },
		],
	},
	test: {
		globals: true,
	},
	esbuild: {
		target: 'es2022',
	},
});
