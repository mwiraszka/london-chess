import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    restoreMocks: true,
    alias: {
      'lichess-pgn-viewer': fileURLToPath(
        new URL('./src/__mocks__/lichess-pgn-viewer.js', import.meta.url),
      ),
    },
  },
});
