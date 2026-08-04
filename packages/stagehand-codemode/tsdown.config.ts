import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/stdio-server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  dts: { sourcemap: true },
  sourcemap: true,
  outDir: 'dist',
});
