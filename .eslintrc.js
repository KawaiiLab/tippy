module.exports = {
  env: {
    commonjs: true,
    node: true,
    es6: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 11
  },
  rules: {
    indent: [
      'error',
      2
    ],
    quotes: [
      'error',
      'single'
    ],
    semi: [
      'error',
      'never'
    ]
  },
  plugins: [
    'markdown',
    'standard'
  ]
}
