import { EXPLANATIONS, redactText, type DetectionResult, type PiiEvent } from '@promptshield/engine';
import * as api from '../api';
import { buildTextModel } from '../editor/textModel';
import { editorFrom, sendButtonFor, type Editor } from '../sites';
import { replaceText } from '../replace';
import { disclosureEvents, submitChecked, rememberAttachments } from '../submission';
import { gateBusy, lockGuard, snapshot, staleNotice } from './shared';
import { toast } from '../ui';
export type FileGateApi = Pick<typeof api, 'getAdapter'|'getMapper'|'saveMapper'|'detectWithTimeout'|'splitForPrompt'|'openGate'|'approve'|'logEvents'|'extractFile'>;
export interface FileGateOptions { isChatTarget?:(target:Element)=>boolean; insertText?:(text:string)=>void|Promise<void>; attachmentAccepted?:(files:File[])=>Promise<boolean>; notify?:(message:string)=>void }
export interface PreparedFile { file: File; redactedText?: string; commit: () => Promise<void> }
// Public preparation helper retained for callers; counters update only on confirmed sends.
export async function prepareFile(file: File, client: FileGateApi): Promise<PreparedFile | null> {
  const extracted = await client.extractFile(file);
  if (extracted.status !== 'ok') return await client.openGate({ mode: 'cant_check', title: 'This file cannot be checked', fileName: file.name, reason: extracted.reason, items: [], topics: [] }) === 'secondary' ? { file, commit: async () => {} } : null;
  const result = await client.detectWithTimeout(extracted.text), { toAsk } = await client.splitForPrompt(result), mapper = await client.getMapper();
  const choice = await client.openGate({ mode: 'file', title: 'Review before sending', fileName: file.name, reason: 'Replace and send creates a plain-text file with the detected details replaced.', items: toAsk.map(f => ({ label: EXPLANATIONS[f.type].label, value: f.value, why: EXPLANATIONS[f.type].why, placeholder: mapper.placeholderFor(f) })), topics: [] });
  if (choice === 'cancel') return null;
  if (choice === 'secondary') return { file, commit: () => client.approve(toAsk) };
  const text = redactText(extracted.text, toAsk, mapper);
  return { file: new File([text], `${file.name.replace(/\.[^.]+$/, '')}-redacted.txt`, { type: 'text/plain' }), redactedText: text, commit: () => client.saveMapper(mapper) };
}
export function createFileGate(client: FileGateApi = api, options: FileGateOptions = {}, win: Window = window): () => void {
  const replay = new WeakSet<Event>(), busyInputs = new WeakSet<HTMLInputElement>();
  let disposed = false;
  const notify = options.notify ?? toast;
  const intercept = (event: Event) => {
    const adapter = client.getAdapter();
    if (disposed || replay.has(event) || !adapter) return;
    const input = event.target instanceof HTMLInputElement && event.target.type === 'file' ? event.target : null;
    if (input && busyInputs.has(input)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const transfer = event.type === 'drop' ? (event as DragEvent).dataTransfer : event.type === 'paste' ? (event as ClipboardEvent).clipboardData : null;
    const files = Array.from(input?.files ?? transfer?.files ?? []); if (!files.length) return;
    const target = event.target instanceof Element ? event.target : null;
    const editor = editorFrom(target) ?? editorFrom(document.activeElement) ?? document.querySelector<HTMLElement>(adapter.editor);
    if (!editor || (event.type === 'drop' && options.isChatTarget && target && !options.isChatTarget(target))) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.type === 'drop' && target) {
      target.dispatchEvent(new Event('dragleave', { bubbles: true, composed: true }));
      target.dispatchEvent(new Event('dragend', { bubbles: true, composed: true }));
    }
    if (input) { busyInputs.add(input); input.value = ''; }
    if (gateBusy()) { if (input) setTimeout(() => busyInputs.delete(input), 0); notify('Finish the current review, then attach these files again.'); return; }
    const unlock = lockGuard()!, state = snapshot(editor);
    void (async () => {
      const mapper = await client.getMapper();
      const draftResult = await client.detectWithTimeout(state.text);
      const draftAsk = (await client.splitForPrompt(draftResult)).toAsk;
      const prepared: Array<{ original: File; text?: string; result?: DetectionResult; toAsk: DetectionResult['findings']; reason?: string }> = [];
      for (const file of files) {
        const extraction = await client.extractFile(file);
        if (extraction.status !== 'ok') { prepared.push({ original: file, toAsk: [], reason: extraction.reason }); continue; }
        if (extraction.text.length > 1000000) { prepared.push({ original: file, toAsk: [], reason: 'Extracted text is too large to scan safely.' }); continue; }
        const result = await client.detectWithTimeout(extraction.text);
        prepared.push({ original: file, text: extraction.text, result, toAsk: (await client.splitForPrompt(result)).toAsk });
      }
      if (!state.valid() || disposed) { staleNotice(); return; }
      const unchecked = prepared.filter(p => p.reason);
      const findings = [...draftAsk, ...prepared.flatMap(p => p.toAsk)];
      const choice = await client.openGate({ mode: unchecked.length ? 'cant_check' : 'file', title: unchecked.length ? 'Some files cannot be checked' : 'Review files before sending', fileName: files.map(f => f.name).join(', '), reason: unchecked.length ? unchecked.map(p => `${p.original.name}: ${p.reason}`).join('\n') : 'Replace and send converts each file into a plain-text attachment with personal details replaced. Send as is keeps the original files.', items: findings.map(f => ({ label: EXPLANATIONS[f.type].label, value: f.value, why: EXPLANATIONS[f.type].why, placeholder: mapper.placeholderFor(f) })), topics: prepared.flatMap(p => p.result?.topics ?? []).map(t => ({ label: EXPLANATIONS[t.topic].label, snippet: t.sentence, why: EXPLANATIONS[t.topic].why })) });
      if (choice === 'cancel') return;
      if (!state.valid() || disposed) { staleNotice(); return; }
      const replacing = choice === 'primary';
      if (replacing && unchecked.length) return;
      const uploads = prepared.map(p => replacing ? new File([redactText(p.text!, p.toAsk, mapper)], `${p.original.name.replace(/\.[^.]+$/, '')}-redacted.txt`, { type: 'text/plain' }) : p.original);
      const checkedDraft = replacing ? redactText(state.text, draftAsk, mapper) : state.text;
      const events: PiiEvent[] = [ ...disclosureEvents(draftResult.findings, replacing ? draftAsk : []), ...prepared.flatMap(p => disclosureEvents(p.result?.findings ?? [], replacing ? p.toAsk : [], 'file')) ];
      if (replacing) await client.saveMapper(mapper); else await client.approve(findings);
      if (!state.valid() || disposed) { staleNotice(); return; }
      if (checkedDraft !== state.text && !replaceText(editor, state.text, checkedDraft)) { notify('Could not replace the draft. No files were attached.'); return; }
      const dt = new DataTransfer(); uploads.forEach(file => dt.items.add(file));
      const fileInput = input ?? document.querySelector<HTMLInputElement>(adapter.fileInput);
      const initialPath = location.pathname;
      if (event.type === 'drop') {
        const e = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, composed: true });
        replay.add(e); editor.dispatchEvent(e);
      } else if (fileInput) {
        fileInput.files = dt.files;
        // File inputs use change; replaying both events can queue the same upload twice.
        const e = new Event('change', { bubbles: true, composed: true });
        replay.add(e); fileInput.dispatchEvent(e);
      } else { notify('This site could not accept the reviewed attachment. Nothing was sent.'); return; }
      rememberAttachments(editor, events, uploads.map(f => f.name));
      let activeEditor = editor;
      let accepted = false;
      if (options.attachmentAccepted) accepted = await options.attachmentAccepted(uploads);
      else {
        for (let i = 0; i < 300; i++) {
          if (!activeEditor.isConnected) {
            const replacement = document.querySelector<HTMLElement>(adapter.editor);
            if (!replacement) { await new Promise(resolve => setTimeout(resolve, 100)); continue; }
            activeEditor = replacement;
            rememberAttachments(activeEditor, events, uploads.map(f => f.name));
          }
          let composer: HTMLElement | null = activeEditor.parentElement;
          while (composer && composer !== document.body && !uploads.every(f => (composer!.textContent ?? '').includes(f.name))) composer = composer.parentElement;
          if (composer === document.body) composer = null;
          if (disposed || !client.getAdapter() || initialPath !== location.pathname || buildTextModel(activeEditor).text !== checkedDraft) return;
          const visible = composer?.textContent ?? '';
          const uploading = composer?.querySelector('[aria-busy="true"], [role="progressbar"], [data-testid*="uploading"]');
          if (!uploading && uploads.every(f => visible.includes(f.name)) && sendButtonFor(adapter, activeEditor)) { accepted = true; break; }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      if (!accepted) { notify('The files were reviewed, but attachment readiness could not be confirmed. Check the attachments before pressing Send.'); return; }
      if (!await submitChecked(activeEditor, events, uploads.map(f => f.name))) notify("Files are attached. Please press the chatbot’s Send button to finish.");
    })().catch(() => notify('The upload review failed. Your original files were not automatically sent. Please try again.')).finally(() => { unlock(); if (input) win.setTimeout(() => busyInputs.delete(input), 0); });
  };
  for (const type of ['input', 'change', 'drop', 'paste']) win.addEventListener(type, intercept, true);
  return () => { disposed = true; for (const type of ['input', 'change', 'drop', 'paste']) win.removeEventListener(type, intercept, true); };
}
const initialized = new WeakMap<Window, () => void>();
export function initFileGate(options: FileGateOptions = {}): void { if (!initialized.has(window)) initialized.set(window, createFileGate(api, options)); }
export function disposeFileGate(): void { initialized.get(window)?.(); initialized.delete(window); }
