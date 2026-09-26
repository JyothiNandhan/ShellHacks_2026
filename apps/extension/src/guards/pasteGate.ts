import { redactText } from '@promptshield/engine';
import { approve, detectWithTimeout, getAdapter, getMapper, getSettings, openGate, saveMapper, splitForPrompt } from '../api';
import { editorFrom } from '../sites';
import { draftWithInsertion, insertAtCaret, saveSelection } from '../editor/textModel';
import { gateBusy, guardError, lockGuard, payloadFor, snapshot, staleNotice } from './shared';
import { toast } from '../ui';
import { settingsReady } from '../storage';
import { replaceText } from '../replace';
import { disclosureEvents, submitChecked } from '../submission';
export function initPasteGate(): () => void {
  const onPaste = (event: ClipboardEvent) => {
    const editor = editorFrom(event.target);
    if (!editor || (settingsReady() && !getAdapter()) || event.clipboardData?.files?.length) return;
    const text = event.clipboardData?.getData('text/plain'); if (!text) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (gateBusy()) { toast('Finish the current privacy review before pasting again.'); return; }
    const unlock = lockGuard()!, saved = saveSelection(editor), state = snapshot(editor);
    const draft = draftWithInsertion(editor, text);
    void (async () => {
      await getSettings();
      if (!getAdapter()) { if (saved.restore()) insertAtCaret(editor, text); return; }
      const result = await detectWithTimeout(draft);
      const { toAsk } = await splitForPrompt(result), mapper = await getMapper();
      if (!state.valid()) { staleNotice(); return; }
      const payload = payloadFor('paste', toAsk, result, mapper);
      if (!toAsk.length) payload.title = 'Review before sending';
      const choice = await openGate(payload);
      if (choice === 'cancel') return;
      if (!state.valid()) { staleNotice(); return; }
      const chosen = choice === 'primary' ? redactText(draft, toAsk, mapper) : draft;
      if (choice === 'primary') await saveMapper(mapper);
      if (!state.valid()) { staleNotice(); return; }
      if (choice === 'secondary') await approve(toAsk);
      if (!state.valid()) { staleNotice(); return; }
      if (!replaceText(editor, state.text, chosen)) { toast('Could not insert the reviewed text automatically.', chosen); return; }
      await submitChecked(editor, disclosureEvents(result.findings, choice === 'primary' ? toAsk : [], 'paste'));
    })().catch(guardError).finally(unlock);
  };
  window.addEventListener('paste', onPaste, true);
  return () => window.removeEventListener('paste', onPaste, true);
}
