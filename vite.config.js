import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '~bootstrap': '/node_modules/bootstrap',
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      format: { comments: false },
    },
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
