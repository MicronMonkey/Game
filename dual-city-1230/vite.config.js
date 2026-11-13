import { defineConfig } from 'vite';

// base './' makes the build work from ANY sub-path (e.g. https://<user>.github.io/<repo>/dual-city-1230/)
// without rebuilding. All runtime URLs go through import.meta.env.BASE_URL.
// For a fixed deployment you can instead set VITE_BASE=/<repo>/dual-city-1230/.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
  server: { host: true },
});
