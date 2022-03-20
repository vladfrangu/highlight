/** @type {() => Promise<import('@jest/types').Config.InitialOptions>} */
// eslint-disable-next-line @typescript-eslint/require-await
export default async () => ({
	coverageProvider: 'v8',
	displayName: 'unit tests',
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	testRunner: 'jest-circus/runner',
	testMatch: ['<rootDir>/tests/**/*.test.ts'],
	globals: {
		'ts-jest': {
			useESM: true,
			tsconfig: '<rootDir>/tests/tsconfig.json',
		},
	},
	extensionsToTreatAsEsm: ['.ts', '.mts'],
	moduleNameMapper: {
		'^#internals/(.*)$': '<rootDir>/src/lib/internals/$1.ts',
		'^#hooks/(.*)$': '<rootDir>/src/lib/utils/hooks/$1.ts',
		'^#types/(.*)$': '<rootDir>/src/lib/types/$1.ts',
		'^#utils/(.*)$': '<rootDir>/src/lib/utils/$1.ts',
		'^#workers/(.*)$': '<rootDir>/src/lib/workers/$1.ts',
		'^#test/(.*)$': '<rootDir>/tests/__shared__/$1.ts',
	},
});
