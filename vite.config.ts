import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  logLevel: 'error',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'vendor-charts';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) return 'vendor-map';
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/date-fns')) return 'vendor-date';
        },
      },
    },
  },
  plugins: [
    base44({
      legacySDKImports: process.env['BASE44_LEGACY_SDK_IMPORTS'] === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true,
    }),
    react(),
  ],
});
