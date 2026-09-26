import { detectFast, type DetectionResult } from '@promptshield/engine';
import { approve, detectWithTimeout, getAdapter, getMapper, getSettings, logEvents, openGate, splitForPrompt } from '../api';
import { approvalKey, peekApprovals } from '../approvals';
import { latestDetection } from '../editor/detectionCache';
import { buildTextModel } from '../editor/textModel';
import { editorForButton, editorFrom, genericSend, sendButtonFor, type Editor } from '../sites';
import { replaceFindings } from '../replace';
import { gateBusy, guardError, lockGuard, payloadFor, snapshot, staleNotice } from './shared';
import { isPlaceholder, settingsReady, settingsSnapshot } from '../storage';
import { toast } from '../ui';

// A failed or slow NER request must not drop names the typing scan already found in this exact text.
function withCached(fresh: DetectionResult, cached?: DetectionResult): DetectionResult {
  if (!cached) return fresh;
  const extra = cached.findings.filter(c => !fresh.findings.some(f => f.start < c.end && c.start < f.end));
  return { findings: [...fresh.findings, ...extra].sort((a, b) => a.start - b.start), topics: fresh.topics };
}

export function initSendCheck(currentEditor: () => Editor | null): () => void {
  let replay: Event | null = null;
  const send = (editor: Editor, originalButton?: HTMLButtonElement | null): boolean => {
    const adapter = getAdapter();
    if (!adapter) return false;
    const button = originalButton?.isConnected ? originalButton : sendButtonFor(adapter, editor);
    if (button && !button.disabled) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window });
      replay = event;
      try { button.dispatchEvent(event); } finally { replay = null; }
    } else {
      editor.focus();
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true });
      replay = event;
      try { editor.dispatchEvent(event); } finally { replay = null; }
    }
    return true;
  };
  const check = (event: Event, editor: Editor, button?: HTMLButtonElement | null) => {
    if (event === replay) return;
    const text = buildTextModel(editor).text;
    if (!text.trim()) return;
    if (gateBusy()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (settingsReady()) {
      const result = latestDetection(editor, text) ?? detectFast(text, settingsSnapshot());
      const approvals = peekApprovals();
      const toAsk = result.findings.filter(f => !f.allowlisted && !approvals?.has(approvalKey(f)) && !isPlaceholder(f));
      if (!toAsk.length) {
        // Preserve the site's trusted click/Enter for clean, allowed, and approved drafts.
        void logEvents(result.findings.filter(f => f.allowlisted), 'typed', 'allowlisted').catch(() => toast('Sent, but the local activity log could not be updated.'));
        return;
      }
    }
    // Stop synchronously: storage and NER are asynchronous, so awaiting first would leak the draft.
    event.preventDefault(); event.stopImmediatePropagation();
    if (gateBusy()) return;
    const unlock = lockGuard()!;
    const state = snapshot(editor);
    const pathname = location.pathname;
    void (async () => {
      await getSettings();
      if (!getAdapter()) {
        // Settings may have disabled protection between document_start and this first event.
        if (button) { const click = new MouseEvent('click', { bubbles: true, cancelable: true }); replay = click; try { button.dispatchEvent(click); } finally { replay = null; } }
        else { const key = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }); replay = key; try { editor.dispatchEvent(key); } finally { replay = null; } }
        return;
      }
      const result = withCached(await detectWithTimeout(state.text), latestDetection(editor, state.text));
      const { toAsk, allowlisted } = await splitForPrompt(result);
      const mapper = await getMapper();
      if (!state.valid()) { staleNotice(); return; }
      const choice = toAsk.length ? await openGate(payloadFor('send', toAsk, result, mapper)) : 'secondary';
      if (choice === 'cancel') return;
      if (!state.valid()) { staleNotice(); return; }
      if (choice === 'primary' && !await replaceFindings(editor, toAsk, true, mapper)) return;
      const chosenText = buildTextModel(editor).text;
      const stillValid = () => editor.isConnected && !!getAdapter() && pathname === location.pathname && buildTextModel(editor).text === chosenText;
      if (!stillValid() || (choice === 'secondary' && !state.valid())) { staleNotice(); return; }
      if (choice === 'secondary' && toAsk.length) await approve(toAsk);
      // Log before replay: navigation/unmount on send must not lose the decision.
      await logEvents(toAsk, 'typed', choice === 'primary' ? 'renamed' : 'as_is');
      await logEvents(allowlisted, 'typed', 'allowlisted');
      if (!stillValid()) { staleNotice(); return; }
      if (!send(editor, button)) toast('Text checked. Press Send to continue.');
    })().catch(guardError).finally(unlock);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event === replay || event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229 || (settingsReady() && !getAdapter())) return;
    const editor = editorFrom(event.target);
    if (editor) check(event, editor);
  };
  const onClick = (event: MouseEvent) => {
    if (event === replay || !(event.target instanceof Element) || (settingsReady() && !getAdapter())) return;
    const adapter = getAdapter();
    if (!adapter) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const nearby = editorForButton(button);
    const editor = nearby ?? currentEditor() ?? editorFrom(document.activeElement) ?? document.querySelector<HTMLElement>(adapter.editor);
    if (!editor) return;
    if (button.matches(`${adapter.sendButton}, ${genericSend}`) || button === sendButtonFor(adapter, editor)) check(event, editor, button);
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('click', onClick, true);
  return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('click', onClick, true); };
}
