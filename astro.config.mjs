// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: [
            'import',
            'global-builtin',
            'color-functions',
          ],
        },
      },
    },

    define: {
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },

    resolve: {
      alias: {
        '~bootstrap': '/node_modules/bootstrap',
      },
    },

    server: {
      proxy: {
        '/api': 'http://localhost:30727',
      },
    },
  },
});