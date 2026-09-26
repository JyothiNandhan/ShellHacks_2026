import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Node 24 strips TypeScript. This loader supplies only the absent engine boundary;
// all tested background/storage/guard code is the production source.
registerHooks({
  resolve(specifier, context, next) {
    if (/\/gateFrame(?:\.ts)?$/.test(specifier)) return next(new URL('./gate-double.mjs', import.meta.url).href, context);
    if (specifier === '@promptshield/engine') return next(new URL('../fixtures/engine.ts', import.meta.url).href, context);
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier, context.parentURL);
      if (!/\.[cm]?[jt]sx?$/.test(url.pathname)) {
        for (const suffix of ['.ts', '/index.ts']) {
          const candidate = new URL(url.href + suffix);
          if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
        }
      }
    }
    return next(specifier, context);
  },
});
