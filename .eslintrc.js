module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	ignorePatterns: ['.eslintrc.js', 'gulpfile.js', '.prettierrc.js', 'dist/**'],
	extends: ['plugin:n8n-nodes-base/community'],
	rules: {
		'n8n-nodes-base/node-param-default-missing': 'error',
	},
	overrides: [
		{
			files: ['package.json'],
			parser: 'jsonc-eslint-parser',
			parserOptions: {
				project: null,
			},
			extends: ['plugin:n8n-nodes-base/community'],
		},
	],
};
