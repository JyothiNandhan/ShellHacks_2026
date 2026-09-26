import { detectFast, type DetectionResult, type Finding } from '@promptshield/engine';
import { getAdapter, getMapper, getSettings, logEvents, saveMapper } from '../api';
import { approvalKey, getApprovals, invalidateApprovals, undoApproval } from '../approvals';
import { cancelGate } from '../gateFrame';
import { fullDetection, getAiState, watchAiState } from '../messages';
import { createOverlay } from '../overlay/overlay';
import { createPanel } from '../panel/panel';
import { replaceFindings } from '../replace';
import { editorFrom, type Editor } from '../sites';
import { isPlaceholder, watchSettings } from '../storage';
import { toast } from '../ui';
import { buildTextModel, caretOffset } from './textModel';
import { clearDetection, rememberDetection } from './detectionCache';

export function initEditorWatcher() {
  let current: Editor | null = null;
  let overlay: ReturnType<typeof createOverlay> | undefined;
  let panel: ReturnType<typeof createPanel> | undefined;
  let cleanupEditor: (() => void) | undefined;
  let version = 0, composing = false, path = location.pathname, lastLetter = false;
  let fastTimer: ReturnType<typeof setTimeout>, fullTimer: ReturnType<typeof setTimeout>;
  let renderVersion = 0, fullInFlight = false, rerunFull = false;
  const ui = () => { overlay ??= createOverlay(); panel ??= createPanel(); panel.setAi(getAiState()); };
  const valid = (editor: Editor, v: number, text: string, pathname: string) => current === editor && editor.isConnected && version === v && !composing && !!getAdapter() && location.pathname === pathname && buildTextModel(editor).text === text;
  const refresh = () => schedule();
  const render = async (editor: Editor, result: DetectionResult, v: number, text: string, pathname: string) => {
    const rv = ++renderVersion;
    const [mapper, approvals] = await Promise.all([getMapper(), getApprovals()]);
    if (rv !== renderVersion || !valid(editor, v, text, pathname)) return;
    const caret = caretOffset(buildTextModel(editor));
    const filtered = result.findings.filter(f => !(lastLetter && f.end === caret) && !isPlaceholder(f));
    const findings = filtered.filter(f => !f.allowlisted && !approvals.has(approvalKey(f)));
    const ignored = filtered.filter(f => f.allowlisted || approvals.has(approvalKey(f)));
    findings.forEach(f => mapper.placeholderFor(f));
    await saveMapper(mapper);
    if (rv !== renderVersion || !valid(editor, v, text, pathname)) return;
    ui();
    const replace = (items: Finding[], all = false) => {
      if (!valid(editor, v, text, pathname)) { refresh(); return; }
      void replaceFindings(editor, items, all).then(async success => {
        if (success) await logEvents(items, 'typed', 'renamed');
        refresh();
      }).catch(() => toast('Couldn’t replace this text. Please try again.'));
    };
    overlay!.render(editor, findings, mapper, f => replace([f]));
    panel!.render({ findings, ignored, topics: result.topics, mapper, replace: f => replace([f]), replaceAll: () => replace(findings, true), undo: f => {
      if (pathname !== location.pathname) return;
      void undoApproval(f).then(refresh).catch(() => toast('Couldn’t undo this approval. Please try again.'));
    } });
  };
  const scan = async (full: boolean) => {
    const editor = current;
    if (!editor || composing || !getAdapter()) return;
    if (full && fullInFlight) { rerunFull = true; return; }
    const v = version, pathname = location.pathname, text = buildTextModel(editor).text;
    try {
      const settings = await getSettings();
      if (!valid(editor, v, text, pathname)) return;
      if (full) fullInFlight = true;
      const result = full ? await fullDetection(text, settings) : detectFast(text, settings);
      if (valid(editor, v, text, pathname)) { if (full) rememberDetection(editor, text, result); await render(editor, result, v, text, pathname); }
    } catch { /* Full model failure is shown by the AI status; retain fast findings. */ }
    finally {
      if (full) { fullInFlight = false; if (rerunFull) { rerunFull = false; void scan(true); } }
    }
  };
  function schedule() {
    version++; clearTimeout(fastTimer); clearTimeout(fullTimer);
    if (composing || !current || !getAdapter()) { overlay?.clear(); panel?.clear(); return; }
    overlay?.clear(); panel?.input();
    fastTimer = setTimeout(() => void scan(false), 300);
    fullTimer = setTimeout(() => void scan(true), 900);
  }
  const setEditor = (editor: Editor) => {
    if (current === editor || !getAdapter()) return;
    cleanupEditor?.(); current = editor; composing = false; lastLetter = false;
    const input = (event: Event) => { const data = (event as InputEvent).data; lastLetter = !!data && /[\p{L}\p{N}]$/u.test(data); schedule(); };
    const keyup = (event: Event) => {
      overlay?.reposition();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'].includes((event as KeyboardEvent).key)) { lastLetter = false; schedule(); }
    };
    const start = () => { composing = true; version++; clearTimeout(fastTimer); clearTimeout(fullTimer); overlay?.clear(); };
    const end = () => { composing = false; lastLetter = false; schedule(); };
    const scroll = () => overlay?.reposition();
    editor.addEventListener('input', input); editor.addEventListener('keyup', keyup); editor.addEventListener('scroll', scroll, { passive: true });
    editor.addEventListener('compositionstart', start); editor.addEventListener('compositionend', end);
    const resize = new ResizeObserver(scroll); resize.observe(editor);
    const mutations = new MutationObserver(() => schedule()); mutations.observe(editor, { childList: true, subtree: true, characterData: true });
    cleanupEditor = () => {
      editor.removeEventListener('input', input); editor.removeEventListener('keyup', keyup); editor.removeEventListener('scroll', scroll);
      editor.removeEventListener('compositionstart', start); editor.removeEventListener('compositionend', end); resize.disconnect(); mutations.disconnect();
    };
    schedule();
  };
  const focus = (event: FocusEvent) => { const editor = editorFrom(event.target); if (editor) setEditor(editor); };
  window.addEventListener('focusin', focus, true);
  const settingsCleanup = watchSettings(() => {
    cancelGate();
    if (current) clearDetection(current);
    if (!getAdapter()) { version++; overlay?.clear(); panel?.clear(); }
    else { const editor = editorFrom(document.activeElement); if (editor) setEditor(editor); schedule(); }
  });
  const aiCleanup = watchAiState(state => panel?.setAi(state));
  const sessionChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'session' && Object.keys(changes).some(key => key.startsWith('approved:'))) { invalidateApprovals(); schedule(); }
    if (area === 'session' && Object.values(changes).some(change => change.newValue === undefined)) { invalidateApprovals(); if (current) clearDetection(current); schedule(); }
  };
  chrome.storage.onChanged.addListener(sessionChange);
  // History methods belong to the site's JS world; polling also covers framework navigation.
  const navigation = setInterval(() => {
    if (path !== location.pathname || (current && !current.isConnected)) {
      path = location.pathname; version++; cancelGate(); cleanupEditor?.(); current = null; overlay?.clear(); panel?.clear();
      const editor = editorFrom(document.activeElement); if (editor) setEditor(editor);
    }
  }, 250);
  void getSettings().then(() => { const editor = editorFrom(document.activeElement); if (editor) setEditor(editor); });
  return {
    current: () => current,
    destroy() { version++; clearTimeout(fastTimer); clearTimeout(fullTimer); clearInterval(navigation); cleanupEditor?.(); settingsCleanup(); aiCleanup(); chrome.storage.onChanged.removeListener(sessionChange); window.removeEventListener('focusin', focus, true); overlay?.destroy(); panel?.destroy(); cancelGate(); },
  };
}
