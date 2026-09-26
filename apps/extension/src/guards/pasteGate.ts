import { redactText } from '@promptshield/engine';
import { approve, detectWithTimeout, getAdapter, getMapper, getSettings, logEvents, openGate, saveMapper, splitForPrompt } from '../api';
import { editorFrom } from '../sites';
import { insertAtCaret, saveSelection } from '../editor/textModel';
import { gateBusy, guardError, lockGuard, payloadFor, snapshot, staleNotice } from './shared';
import { toast } from '../ui';
import { settingsReady } from '../storage';
export function initPasteGate(): () => void {
  const onPaste = (event: ClipboardEvent) => {
    const editor = editorFrom(event.target);
    if (!editor || (settingsReady() && !getAdapter())) return;
    const text = event.clipboardData?.getData('text/plain');
    if (!text) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (gateBusy()) { toast('Finish the current privacy review before pasting again.'); return; }
    const unlock = lockGuard()!;
    const saved = saveSelection(editor);
    const state = snapshot(editor);
    void (async () => {
      await getSettings();
      if (!getAdapter()) { if (saved.restore()) insertAtCaret(editor, text); return; }
      const result = await detectWithTimeout(text);
      const { toAsk, allowlisted } = await splitForPrompt(result);
      const mapper = await getMapper();
      if (!state.valid()) { staleNotice(); return; }
      const choice = toAsk.length ? await openGate(payloadFor('paste', toAsk, result, mapper)) : 'secondary';
      if (choice === 'cancel') return;
      if (!state.valid()) { staleNotice(); return; }
      const chosen = choice === 'primary' ? redactText(text, toAsk, mapper) : text;
      if (choice === 'primary') await saveMapper(mapper);
      if (!state.valid()) { staleNotice(); return; }
      if (!saved.restore() || !insertAtCaret(editor, chosen)) {
        // This notification lives in a closed shadow root. Clipboard writes contain only the chosen text.
        await navigator.clipboard.writeText(chosen).then(() => toast('Couldn’t insert automatically. Press Ctrl+V.'), () => toast('Couldn’t insert automatically.', chosen));
        return;
      }
      if (choice === 'secondary' && toAsk.length) await approve(toAsk);
      await logEvents(toAsk, 'paste', choice === 'primary' ? 'renamed' : 'as_is');
      await logEvents(allowlisted, 'paste', 'allowlisted');
    })().catch(guardError).finally(unlock);
  };
  window.addEventListener('paste', onPaste, true);
  return () => window.removeEventListener('paste', onPaste, true);
}
