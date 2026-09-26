import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({resolve:{alias:{'server-only':fileURLToPath(new URL('./tests/empty.ts',import.meta.url))}},test:{include:['tests/**/*.test.ts','tests/**/*.test.tsx'],restoreMocks:true}});
