import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    'process.env': process.env
  },
  server: {
    open: true, // автоматически открывать браузер
  },
  resolve: {
    alias: {
      'three': resolve(__dirname, 'node_modules/three')
    }
  },
  optimizeDeps: {
    include: ['three']
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
});
