module.exports = {
	projects: [
		{
			displayName: 'rules',
			testMatch: ['**/__tests__/firestore-rules/**/*.test.ts'],
			transform: { '^.+\\.ts$': 'ts-jest' },
			testEnvironment: 'node',
		},
		{
			displayName: 'unit',
			testMatch: ['**/__tests__/services/**/*.test.ts'],
			preset: 'jest-expo',
			testEnvironment: 'node',
			moduleNameMapper: {
				'^@/(.*)$': '<rootDir>/$1',
				// Stub out expo winter runtime modules that use import.meta (not available in Jest CJS)
				'^expo/src/winter$': '<rootDir>/__tests__/__mocks__/expo-winter-runtime.js',
				'^expo/src/winter/(.*)$': '<rootDir>/__tests__/__mocks__/expo-winter-runtime.js',
				'^expo/src/async-require/(.*)$': '<rootDir>/__tests__/__mocks__/expo-winter-runtime.js',
				// Stub expo-location (uses native modules unavailable in Node test env)
				'^expo-location$': '<rootDir>/__tests__/__mocks__/expo-location.js',
			},
		},
	],
};
