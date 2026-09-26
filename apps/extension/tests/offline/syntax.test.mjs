import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('../../', import.meta.url));
function files(path) { return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]); }
test('production TypeScript parses without a dependency install (not a typecheck)', () => {
  for (const path of [...files(join(base, 'src')), ...files(join(base, 'entrypoints'))].filter(p => p.endsWith('.ts'))) assert.doesNotThrow(() => stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'strip' }), path);
});
