import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
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
        __APP_VERSION__: JSON.stringify(version),
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
})
