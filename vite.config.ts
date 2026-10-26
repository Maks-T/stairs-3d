import path from 'node:path';
import { defineConfig } from 'vite';
import { flatManifestPlugin, getVmsBuildConfig } from './config/deploy/vms-nc';

const SRC_DIR = path.resolve(__dirname, './src');
const PACKAGES_DIR = path.resolve(__dirname, './packages');

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [flatManifestPlugin()],
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [__dirname],
    },
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: [
      { find: '@', replacement: SRC_DIR },
      {
        find: 'estimate',
        replacement: path.resolve(PACKAGES_DIR, 'estimate/src'),
      },
      {
        find: /^linear-cutter\/worker/,
        replacement: path.resolve(PACKAGES_DIR, 'linear-cutter/src/js/worker.js'),
      },
      {
        // package.json пакета: exports "." -> ./dist/LinearCutter.js
        find: 'linear-cutter',
        replacement: path.resolve(PACKAGES_DIR, 'linear-cutter'),
      },
      {
        find: /^reverse-cutter\/worker/,
        replacement: path.resolve(PACKAGES_DIR, 'reverse-cutter/src/worker.ts'),
      },
      {
        find: 'reverse-cutter',
        replacement: path.resolve(PACKAGES_DIR, 'reverse-cutter'),
      },
    ],
  },
  build: getVmsBuildConfig(mode),
}));
