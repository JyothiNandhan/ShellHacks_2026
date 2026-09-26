import type { Finding, PiiEvent } from '@promptshield/engine';
import { getAdapter } from './api';
import { approvalKey } from './approvals';
import { observeSentPrompt } from './confirmedSend';
import { buildTextModel } from './editor/textModel';
import { sendButtonFor, type Editor } from './sites';
import { isPlaceholder } from './storage';
import { toast } from './ui';
export const replayedEvents = new WeakSet<Event>();
const pending = new WeakMap<Editor, { path: string; events: PiiEvent[]; names: string[] }>();
export function rememberAttachments(editor: Editor, events: PiiEvent[], names: string[]) {
  pending.set(editor, { path: location.pathname, events: events.filter(e => e.source === 'file'), names });
}
export function pendingAttachments(editor: Editor) {
  const value = pending.get(editor);
  return value?.path === location.pathname ? value : undefined;
}
export function forgetAttachments(editor: Editor) { pending.delete(editor); }
export function disclosureEvents(findings: Finding[], renamed: Finding[] = [], source: PiiEvent['source'] = 'typed'): PiiEvent[] {
  const adapter = getAdapter(); if (!adapter) return [];
  const replacements = new Set(renamed.map(approvalKey));
  return findings.filter(f => !isPlaceholder(f)).map(f => ({ type: f.type, site: adapter.id, source, action: replacements.has(approvalKey(f)) ? 'renamed' : f.allowlisted ? 'allowlisted' : 'as_is', ts: Date.now() }));
}
export async function submitChecked(editor: Editor, events: PiiEvent[], attachmentNames: string[] = []): Promise<boolean> {
  const adapter = getAdapter(); if (!adapter) return false;
  const text = buildTextModel(editor).text, path = location.pathname;
  // Framework-controlled Send buttons often enable on the next render after insertion.
  let button: HTMLButtonElement | null = null;
  for (let i = 0; i < 20; i++) {
    if (!editor.isConnected || !getAdapter() || path !== location.pathname || buildTextModel(editor).text !== text) return false;
    button = sendButtonFor(adapter, editor);
    if (button) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const stop = observeSentPrompt(editor, text, adapter.id, events, () => forgetAttachments(editor), attachmentNames);
  const event = button ? new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window }) : new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true });
  replayedEvents.add(event);
  try { (button ?? editor).dispatchEvent(event); return true; }
  catch { stop(); toast('The text was checked, but automatic send failed. Please press Send.'); return false; }
}
