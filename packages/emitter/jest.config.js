/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.spec.ts'],
	moduleNameMapper: {
		'^@tspruino/machine$': '<rootDir>/../machine/src',
	},
};
