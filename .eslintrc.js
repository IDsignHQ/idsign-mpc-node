module.exports = {
	root: true,
	extends: ['next', 'prettier'],
	rules: {
		'@next/next/no-html-link-for-pages': 'off',
		'semi': ['error', 'never'],
		'prefer-const': 'error',
		'quotes': [2, 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
		'comma-dangle': ['error', 'never'],
		'indent': ['error', 'tab']
	},
	parserOptions: {
		babelOptions: {
			presets: [require.resolve('next/babel')]
		}
	}
}
