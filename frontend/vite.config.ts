import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3003,
      host: '0.0.0.0',
    },
    base: '/',
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            lucide: ['lucide-react'],
            supabase: ['@supabase/supabase-js'],
            charts: ['recharts'],
            maps: ['mapbox-gl'],
            // Group export libs into one predictable chunk — avoids orphaned dynamic chunks in production
            'forms-export': ['xlsx', 'jspdf', 'jspdf-autotable'],
          }
        }
      }
    }
  };
});
