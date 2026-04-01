import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,

  rules: {
    // Allow console.debug/error/warn in extension code
    'no-console': ['warn', { allow: ['debug', 'error', 'warn'] }],
    // WXT and webext-bridge use browser globals
    'no-undef': 'off',
  },

  ignores: [
    '**/node_modules/**',
    '**/.output/**',
    '**/.wxt/**',
    '**/dist/**',
  ],
})
