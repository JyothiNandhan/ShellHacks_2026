import { defineContentScript } from 'wxt/utils/define-content-script';
import { initEditorWatcher } from '../src/editor/editorWatcher';
import { initPasteGate } from '../src/guards/pasteGate';
import { initSendCheck } from '../src/guards/sendCheck';
import { initFileGate } from '../src/guards/fileGate';
export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*'],
  runAt: 'document_start',
  main(ctx) {
    const watcher = initEditorWatcher();
    const pasteCleanup = initPasteGate();
    const sendCleanup = initSendCheck(watcher.current);
    try { initFileGate(); } catch { console.warn('PromptShield file gate disabled'); }
    ctx.onInvalidated(() => { pasteCleanup(); sendCleanup(); watcher.destroy(); });
  },
});
