import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * ESLint flat config for the mirror website. Ignores the `dist` build output and
 * applies the JS recommended set plus the React Hooks and React Refresh (Vite)
 * presets to every `.js`/`.jsx` file. Browser globals are joined by the two
 * build-time constants Vite injects via `define` (`__BUILD_DATE__`,
 * `__NEKOHA_API_VERSION__`) declared `readonly`, so referencing them is not a
 * `no-undef` error. The `no-unused-vars` override whitelists identifiers starting
 * with a capital letter or underscore, which is what keeps unused component and
 * constant imports from failing the lint.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default defineConfig([
    globalIgnores(['dist']), {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: { ...globals.browser, __BUILD_DATE__: 'readonly', __NEKOHA_API_VERSION__: 'readonly' },
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        rules: {
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
        },
    },
])
