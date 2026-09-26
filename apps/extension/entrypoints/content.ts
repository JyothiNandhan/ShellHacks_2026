import { defineContentScript } from 'wxt/utils/define-content-script';
import { initEditorWatcher } from '../src/editor/editorWatcher';
import { initPasteGate } from '../src/guards/pasteGate';
import { initSendCheck } from '../src/guards/sendCheck';
import { initFileGate, disposeFileGate } from '../src/guards/fileGate';
import { toast } from '../src/ui';
export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*'],
  runAt: 'document_start',
  main(ctx) {
    const watcher = initEditorWatcher();
    const pasteCleanup = initPasteGate();
    const sendCleanup = initSendCheck(watcher.current);
    try { initFileGate({ notify: message => toast(message) }); } catch { toast('File protection could not start. Reload this tab before attaching a file.'); }
    ctx.onInvalidated(() => { pasteCleanup(); sendCleanup(); disposeFileGate(); watcher.destroy(); });
  },
});
