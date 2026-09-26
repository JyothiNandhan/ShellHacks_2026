import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const sites = ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*'];
const engineManifest = JSON.parse(readFileSync(new URL('../../packages/engine/package.json', import.meta.url), 'utf8'));
// The NER model's ONNX runtime must be served from the extension, never a CDN (engine README).
const transformersDist = dirname(createRequire(import.meta.url).resolve('@huggingface/transformers'));
const nerWasm = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()], define: { __PROMPTSHIELD_ENGINE_STUB__: JSON.stringify(engineManifest.promptshieldTemporaryStub === true) } }),
  hooks: {
    'build:publicAssets': (_, files) => {
      for (const name of nerWasm) files.push({ absoluteSrc: join(transformersDist, name), relativeDest: `promptshield-wasm/${name}` });
    },
  },
  manifest: {
    name: 'PromptShield',
    description: 'Catch personal information before you share it with AI.',
    minimum_chrome_version: '116',
    permissions: ['storage', 'offscreen', 'clipboardWrite'],
    host_permissions: [...sites, 'https://huggingface.co/*', 'https://*.hf.co/*'],
    web_accessible_resources: [{ resources: ['gate.html'], matches: sites }],
    content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" },
  },
});
