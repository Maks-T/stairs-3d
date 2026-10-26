import type { Plugin, UserConfig } from 'vite';

export function flatManifestPlugin(): Plugin {
  return {
    name: 'vite-plugin-flat-manifest',
    generateBundle(_options, bundle) {
      const manifest: Record<string, string> = {};

      for (const [fileName, fileInfo] of Object.entries(bundle)) {
        if (fileInfo.type === 'chunk' && fileInfo.isEntry) {
          manifest['main.js'] = fileName;
        }
        if (
          fileInfo.type === 'asset' &&
          fileName.endsWith('.css') &&
          fileName.includes('main')
        ) {
          manifest['main.css'] = fileName;
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}

export function getVmsBuildConfig(mode: string): UserConfig['build'] {
  const isDev = mode === 'development';

  return {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: isDev,
    rollupOptions: {
      output: {
        entryFileNames: 'js/main.[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          return name.endsWith('.css') ? 'css/main.[hash][extname]' : 'assets/[name].[hash][extname]';
        },
      },
    },
  };
}