import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    'process.env.SERVER_NAME': JSON.stringify(process.env.SERVER_NAME || 'localhost'),
    'process.env.SERVER_PORT': JSON.stringify(process.env.SERVER_PORT || '3000'),
    'process.env.POSTGRES_HOST': JSON.stringify(process.env.POSTGRES_HOST || 'postgres'),
    'process.env.POSTGRES_DB': JSON.stringify(process.env.POSTGRES_DB || 'admin'),
    'process.env.POSTGRES_USER': JSON.stringify(process.env.POSTGRES_USER || 'admin'),
    'process.env.POSTGRES_PASSWORD': JSON.stringify(process.env.POSTGRES_PASSWORD || 'admin')
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
