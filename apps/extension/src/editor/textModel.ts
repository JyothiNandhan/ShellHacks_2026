import type { Editor } from '../sites';
export interface Segment { node: Text; start: number; end: number }
export interface TextModel { editor: Editor; text: string; segments: Segment[] }
const blocks = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'BLOCKQUOTE', 'TR']);
export function buildTextModel(editor: Editor): TextModel {
  if (editor instanceof HTMLTextAreaElement) return { editor, text: editor.value, segments: [] };
  let text = '';
  const segments: Segment[] = [];
  const newline = () => { if (text && !text.endsWith('\n')) text += '\n'; };
  const walk = (node: Node) => {
    if (node instanceof Text) {
      const start = text.length;
      text += node.data;
      segments.push({ node, start, end: text.length });
    } else if (node instanceof Element) {
      if (['SCRIPT', 'STYLE'].includes(node.tagName) || node.getAttribute('contenteditable') === 'false') return;
      if (node.tagName === 'BR') { text += '\n'; return; }
      if (blocks.has(node.tagName)) newline();
      node.childNodes.forEach(walk);
      if (blocks.has(node.tagName) && node.nextSibling) newline();
    }
  };
  editor.childNodes.forEach(walk);
  return { editor, text, segments };
}
export function rangeFor(model: TextModel, start: number, end: number): Range | null {
  if (start < 0 || end < start || end > model.text.length || !model.segments.length) return null;
  const first = model.segments.find(s => s.end > start) ?? model.segments.at(-1)!;
  const last = [...model.segments].reverse().find(s => s.start < end) ?? first;
  const range = document.createRange();
  range.setStart(first.node, Math.max(0, Math.min(first.node.length, start - first.start)));
  range.setEnd(last.node, Math.max(0, Math.min(last.node.length, end - last.start)));
  return range;
}
export function caretOffset(model: TextModel): number | null {
  if (model.editor instanceof HTMLTextAreaElement) return model.editor.selectionStart;
  const selection = window.getSelection();
  if (!selection?.focusNode || !model.editor.contains(selection.focusNode)) return null;
  const segment = model.segments.find(s => s.node === selection.focusNode);
  if (segment) return segment.start + selection.focusOffset;
  const range = document.createRange();
  range.selectNodeContents(model.editor);
  range.setEnd(selection.focusNode, selection.focusOffset);
  const scratch = document.createElement('div');
  scratch.append(range.cloneContents());
  return buildTextModel(scratch).text.length;
}
export interface SavedSelection { text: string; restore(): boolean }
export function draftWithInsertion(editor: Editor, inserted: string): string {
  const model = buildTextModel(editor);
  if (editor instanceof HTMLTextAreaElement) return model.text.slice(0, editor.selectionStart) + inserted + model.text.slice(editor.selectionEnd);
  const selection = window.getSelection();
  if (!selection?.rangeCount) return model.text + inserted;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return model.text + inserted;
  const offsetAt = (node: Node, offset: number) => {
    if (node instanceof Text) return (model.segments.find(s => s.node === node)?.start ?? model.text.length) + offset;
    const child = node.childNodes[offset];
    if (child) return model.segments.find(s => s.node === child || child.contains(s.node))?.start ?? model.text.length;
    return [...model.segments].reverse().find(s => node.contains(s.node))?.end ?? model.text.length;
  };
  return model.text.slice(0, offsetAt(range.startContainer, range.startOffset)) + inserted + model.text.slice(offsetAt(range.endContainer, range.endOffset));
}
export function saveSelection(editor: Editor): SavedSelection {
  const text = buildTextModel(editor).text;
  if (editor instanceof HTMLTextAreaElement) {
    const start = editor.selectionStart, end = editor.selectionEnd;
    return { text, restore: () => {
      if (!editor.isConnected || editor.value !== text) return false;
      editor.focus(); editor.setSelectionRange(start, end); return true;
    } };
  }
  const selection = window.getSelection();
  let range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  if (!range || !editor.contains(range.commonAncestorContainer)) {
    range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
  }
  const saved = range;
  return { text, restore: () => {
    if (!editor.isConnected || buildTextModel(editor).text !== text) return false;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges(); sel.addRange(saved); return true;
  } };
}
export function insertAtCaret(editor: Editor, text: string): boolean {
  editor.focus();
  const before = buildTextModel(editor).text;
  if (editor instanceof HTMLTextAreaElement) {
    const start = editor.selectionStart, end = editor.selectionEnd;
    editor.setRangeText(text, start, end, 'end');
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    return editor.value === before.slice(0, start) + text + before.slice(end);
  }
  const selection = window.getSelection();
  if (!selection?.rangeCount || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return false;
  try {
    const ok = document.execCommand('insertText', false, text);
    return ok && (buildTextModel(editor).text !== before || text === '');
  } catch { return false; }
}
