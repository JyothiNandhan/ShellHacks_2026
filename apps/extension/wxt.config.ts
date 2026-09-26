import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const sites = ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*'];
// The site guards are connected, so Person 3's dashboard/popup hide their 'Setup in progress' notice.
process.env.VITE_GUARDS_READY ??= 'true';
const engineManifest = JSON.parse(readFileSync(new URL('../../packages/engine/package.json', import.meta.url), 'utf8'));

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()], define: { __PROMPTSHIELD_ENGINE_STUB__: JSON.stringify(engineManifest.promptshieldTemporaryStub === true) } }),
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
