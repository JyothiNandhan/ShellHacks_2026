import { chatgpt } from './chatgpt';
import { claude } from './claude';
import { gemini } from './gemini';
import type { SiteAdapter } from './types';
export type { SiteAdapter } from './types';
export const adapters = [chatgpt, claude, gemini];
export const siteAdapter = () => adapters.find(a => a.hostnames.includes(location.hostname)) ?? null;
export type Editor = HTMLElement | HTMLTextAreaElement;
export function editorFrom(target: EventTarget | null): Editor | null {
  if (!(target instanceof Element)) return null;
  const editor = target.closest<HTMLElement>('[contenteditable="true"], textarea');
  if (!editor || editor.closest('[data-promptshield]')) return null;
  const rect = editor.getBoundingClientRect();
  return rect.width >= 100 && rect.height >= 20 ? editor : null;
}
export const genericSend = 'button[aria-label*="Send" i]';
export function editorForButton(button: HTMLButtonElement): Editor | null {
  let parent = button.parentElement;
  while (parent && parent !== document.body) {
    const editors = [...parent.querySelectorAll<HTMLElement>('[contenteditable="true"], textarea')].map(editorFrom).filter((e): e is Editor => !!e);
    const unique = [...new Set(editors)];
    if (unique.length === 1) return unique[0];
    if (unique.length > 1) return null;
    parent = parent.parentElement;
  }
  return null;
}
export function sendButtonFor(adapter: SiteAdapter, editor: Editor): HTMLButtonElement | null {
  // Search from the editor outward, so editing an earlier message never submits the main box.
  const editing = !editor.matches(adapter.editor);
  const selector = editing ? `${adapter.editSendButton ?? adapter.sendButton}, ${genericSend}` : `${adapter.sendButton}, ${genericSend}`;
  let parent = editor.parentElement;
  while (parent && parent !== document.body) {
    const button = [...parent.querySelectorAll<HTMLButtonElement>(selector)].find(b => !b.disabled && b.getClientRects().length);
    if (button) return button;
    if (editing) {
      const save = [...parent.querySelectorAll<HTMLButtonElement>('button')].find(b => /^(save(?:\s*(?:&|and)\s*submit)?|send|update)$/i.test(b.textContent?.trim() ?? '') && !b.disabled);
      if (save) return save;
    }
    parent = parent.parentElement;
  }
  return null;
}
