import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@promptshield/engine': fileURLToPath(new URL('./tests/fixtures/engine.ts', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'], restoreMocks: true },
});
