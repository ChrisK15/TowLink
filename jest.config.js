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
			moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
		},
	],
};
