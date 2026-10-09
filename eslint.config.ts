import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '.old-nuxt/**',
      '.backup-nuxt/**',
      'public/**'
    ]
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      // `condition && action()` is the code style of this project
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }]
    }
  }
)
