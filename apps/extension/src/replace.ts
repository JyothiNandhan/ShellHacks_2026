import { redactText, type Finding, type PlaceholderMapper } from '@promptshield/engine';
import { buildTextModel, insertAtCaret, rangeFor } from './editor/textModel';
import { getMapper, saveMapper } from './storage';
import type { Editor } from './sites';
import { toast } from './ui';
function select(editor: Editor, start: number, end: number): boolean {
  editor.focus();
  if (editor instanceof HTMLTextAreaElement) { editor.setSelectionRange(start, end); return true; }
  const model = buildTextModel(editor);
  const range = model.text.length === 0 ? document.createRange() : rangeFor(model, start, end);
  if (range && model.text.length === 0) range.selectNodeContents(editor);
  const selection = window.getSelection();
  if (!range || !selection) return false;
  selection.removeAllRanges(); selection.addRange(range);
  return true;
}
export function replaceText(editor: Editor, expected: string, replacement: string): boolean {
  if (buildTextModel(editor).text !== expected) return false;
  if (expected === replacement) return true;
  return select(editor, 0, expected.length) && insertAtCaret(editor, replacement) && buildTextModel(editor).text === replacement;
}
export async function replaceFindings(editor: Editor, findings: Finding[], all = false, givenMapper?: PlaceholderMapper): Promise<boolean> {
  const model = buildTextModel(editor);
  const targets = all ? findings : findings.slice(0, 1);
  if (!targets.length || targets.some(f => model.text.slice(f.start, f.end) !== f.value)) {
    toast('The text changed. Review the updated findings.'); return false;
  }
  const path = location.pathname;
  const mapper = givenMapper ?? await getMapper();
  const safe = redactText(model.text, targets, mapper);
  if (path !== location.pathname || buildTextModel(editor).text !== model.text) return false;
  await saveMapper(mapper);
  if (path !== location.pathname || buildTextModel(editor).text !== model.text) return false;
  // Replace each span from the end, so earlier offsets stay valid and line breaks and formatting are never retyped.
  let success = true;
  for (const finding of [...targets].sort((a, b) => b.start - a.start)) {
    if (!select(editor, finding.start, finding.end) || !insertAtCaret(editor, mapper.placeholderFor(finding))) { success = false; break; }
  }
  success = success && buildTextModel(editor).text === safe;
  if (!success) toast('Couldn’t replace automatically.', safe);
  return success;
}
