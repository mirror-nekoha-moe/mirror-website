import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_VERSION_FALLBACK = '1.3.2'
const API_PACKAGE_URL = 'https://raw.githubusercontent.com/mirror-nekoha-moe/mirror-server/master/package.json'

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

export default defineConfig(async () => ({
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
        __NEKOHA_API_VERSION__: JSON.stringify(await apiVersion()),
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
