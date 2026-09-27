import { describe, it, expect, afterEach, vi } from 'vitest';
import { replaceText } from '../src/replace';
import { buildTextModel } from '../src/editor/textModel';
// jsdom has no execCommand: emulate insertText by replacing the current selection with a text node.
function fakeInsertText() {
  (document as any).execCommand = vi.fn((command: string, _ui: boolean, text: string) => {
    if (command !== 'insertText') return false;
    const range = window.getSelection()!.getRangeAt(0);
    range.deleteContents(); range.insertNode(document.createTextNode(text)); return true;
  });
}
const editor = (html: string) => { const div = document.createElement('div'); div.setAttribute('contenteditable', 'true'); div.innerHTML = html; document.body.append(div); return div; };
afterEach(() => { document.body.replaceChildren(); window.getSelection()?.removeAllRanges(); });
describe('replaceText in rich editors', () => {
  it('replaces the empty paragraph that ProseMirror and Quill keep in an empty composer', () => {
    fakeInsertText();
    const el = editor('<p><br class="ProseMirror-trailingBreak"></p>');
    const before = buildTextModel(el).text;
    expect(before).toBe('\n');
    expect(replaceText(el, before, '\nMy email is [EMAIL_1]')).toBe(true);
    expect(buildTextModel(el).text).toBe('My email is [EMAIL_1]');
  });
  it('still replaces existing text', () => {
    fakeInsertText();
    const el = editor('<p>Question: a@example.com</p>');
    expect(replaceText(el, 'Question: a@example.com', 'Question: [EMAIL_1]')).toBe(true);
    expect(buildTextModel(el).text).toBe('Question: [EMAIL_1]');
  });
  it('refuses when the text changed since the review', () => {
    fakeInsertText();
    const el = editor('<p>changed</p>');
    expect(replaceText(el, 'original', 'safe')).toBe(false);
  });
});
describe('replaceText tolerates editor whitespace rewrites', () => {
  it('accepts non-breaking spaces and paragraph splits the editor introduces', () => {
    (document as any).execCommand = vi.fn((_c: string, _u: boolean, text: string) => {
      const range = window.getSelection()!.getRangeAt(0); range.deleteContents();
      range.insertNode(document.createTextNode(text.replace(/ /g, ' '))); return true;
    });
    const el = editor('<p><br></p>');
    expect(replaceText(el, '\n', '\nHi PERSON_1, my SSN is SSN_1.')).toBe(true);
  });
});
