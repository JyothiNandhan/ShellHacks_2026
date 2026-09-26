import { describe, it, expect, afterEach } from 'vitest';
import { buildTextModel, caretOffset, rangeFor, saveSelection, insertAtCaret } from '../src/editor/textModel';
const editor = (html: string) => { const div = document.createElement('div'); div.setAttribute('contenteditable', 'true'); div.innerHTML = html; document.body.append(div); return div; };
afterEach(() => { document.body.replaceChildren(); window.getSelection()?.removeAllRanges(); });
describe('rich editor offsets', () => {
  it('models blocks, explicit breaks, and inline formatting consistently', () => {
    const element = editor('<p>Hi <strong>Alex</strong></p><p>mail<br>a@example.com</p>');
    const model = buildTextModel(element);
    expect(model.text).toBe('Hi Alex\nmail\na@example.com');
    expect(rangeFor(model, 3, 7)?.toString()).toBe('Alex');
    const start = model.text.indexOf('a@example.com');
    expect(rangeFor(model, start, model.text.length)?.toString()).toBe('a@example.com');
  });
  it('matches across inline nodes and rejects invalid ranges', () => {
    const model = buildTextModel(editor('<p>alex@<b>example</b>.com</p>'));
    expect(rangeFor(model, 0, model.text.length)?.toString()).toBe('alex@example.com');
    expect(rangeFor(model, -1, 3)).toBeNull();
    expect(rangeFor(model, 0, 100)).toBeNull();
  });
  it('maps UTF-16 offsets without corrupting emoji', () => {
    const element = editor('<p>👋 alex@example.com</p>'), model = buildTextModel(element);
    const range = rangeFor(model, 3, model.text.length)!;
    expect(range.toString()).toBe('alex@example.com');
    range.collapse(true); window.getSelection()?.addRange(range);
    expect(caretOffset(model)).toBe(3);
  });
  it('does not restore a stale or detached draft selection', () => {
    const element = editor('first');
    const saved = saveSelection(element);
    element.textContent = 'second'; expect(saved.restore()).toBe(false);
    const latest = saveSelection(element); element.remove(); expect(latest.restore()).toBe(false);
  });
  it('replaces a textarea selection and dispatches input', () => {
    const area = document.createElement('textarea'); area.value = 'hello secret world'; document.body.append(area);
    area.setSelectionRange(6, 12); let inputs = 0; area.addEventListener('input', () => inputs++);
    expect(insertAtCaret(area, 'TERM_1')).toBe(true);
    expect(area.value).toBe('hello TERM_1 world'); expect(inputs).toBe(1);
  });
});
