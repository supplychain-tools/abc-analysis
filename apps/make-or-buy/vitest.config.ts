import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // The same alias tsconfig gives the editor and Next gives the build, so a
    // module resolves identically whether it is being typed, bundled or tested.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    // This tool's calculation layer. The shared layer answers for itself, in
    // packages/shared; browser behaviour is covered end to end, in e2e/.
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
