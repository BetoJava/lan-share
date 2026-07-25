module.exports = {
  root: true,
  env: { es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  rules: {
    // Bun.serve expose les WebSocket via un type générique : les handlers
    // reçoivent des données non typées côté application
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
