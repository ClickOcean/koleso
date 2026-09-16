import path from 'path';

import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tsconfigPaths(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "${path.join(process.cwd(), 'src/_mantine').replace(/\\/g, '/')}" as mantine;`,
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    open: false,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mantine': ['@mantine/core', '@mantine/hooks', '@mantine/notifications', '@mantine/dropzone'],
          'vendor-gsap': ['gsap'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/shared/test/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
    css: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
