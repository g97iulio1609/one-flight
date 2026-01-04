import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'agents/index': 'src/agents/index.ts',
    'services/index': 'src/services/index.ts',
    'tools/index': 'src/tools/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@onecoach/lib-ai', '@onecoach/lib-shared', '@onecoach/types'],
});
