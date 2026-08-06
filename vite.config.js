import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_VERSION_FALLBACK = '1.3.2'
const API_PACKAGE_URL = 'https://raw.githubusercontent.com/mirror-nekoha-moe/mirror-server/master/package.json'

/**
 * Resolves the mirror-server API version at build time by fetching the upstream
 * `package.json` straight from GitHub raw. Every failure mode collapses to
 * `API_VERSION_FALLBACK` on purpose, so a rate-limited, offline or slow GitHub
 * can never break the build: a non-2xx response, a missing/empty/non-string
 * `version` field, and any thrown error (including the 4s `AbortSignal.timeout`
 * firing) all return the fallback instead of propagating.
 *
 * @returns {Promise<string>} The upstream package version, or `API_VERSION_FALLBACK`.
 */
async function apiVersion() {
    try {
        const res = await fetch(API_PACKAGE_URL, { signal: AbortSignal.timeout(4000) })
        if (!res.ok) return API_VERSION_FALLBACK
        const pkg = await res.json()
        return typeof pkg.version === 'string' && pkg.version ? pkg.version : API_VERSION_FALLBACK
    } catch {
        return API_VERSION_FALLBACK
    }
}

/**
 * Vite configuration for the mirror website, supplied as an **async factory**
 * specifically so `apiVersion()` can be awaited before `define` is assembled:
 * `__BUILD_DATE__` and `__NEKOHA_API_VERSION__` are compile-time literal
 * substitutions, so both values are frozen into the bundle at build time rather
 * than read at runtime. Vite calls this factory for `serve` as well as `build`,
 * so the remote version fetch is restricted to `command === 'build'` and
 * `vite dev` uses `API_VERSION_FALLBACK` outright: an unreachable GitHub would
 * otherwise stall dev startup for the full 4s timeout.
 *
 * Also silences three Sass 1.80+ deprecations (`import`,
 * `global-builtin`, `color-functions`) raised by the legacy `@import` chain in
 * `src/scss/` and by Bootstrap's own stylesheets, aliases `~bootstrap` to the
 * installed package so `@import '~bootstrap'` resolves, emits unhashed output
 * names (`assets/[name].js` for entries and chunks, `assets/[name].[ext]` for
 * other assets), and proxies `/api` to `http://localhost:30727` during
 * `vite dev`.
 *
 * Note the export is the factory itself, not an already-resolved config: Vite
 * calls it and awaits the `UserConfig` it resolves to.
 *
 * @type {import('vite').UserConfigFnPromise}
 */
export default defineConfig(async ({ command }) => ({
    plugins: [react()],
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
            },
        },
    },
    define: {
        __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
        __NEKOHA_API_VERSION__: JSON.stringify(command === 'build' ? await apiVersion() : API_VERSION_FALLBACK),
    },
    resolve: {
        alias: {
            '~bootstrap': '/node_modules/bootstrap',
        }
    },
    build: {
        minify: 'esbuild',
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`,
            }
        }
    },
    server: {
        proxy: {
            '/api': 'http://localhost:30727',
        },
    }
}))
