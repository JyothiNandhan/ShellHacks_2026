import { afterEach, expect, it, vi } from 'vitest';
import { cancelGate, openGate } from '../src/gateFrame';
import type { GatePayload } from '../src/api';
afterEach(() => { cancelGate(); document.body.innerHTML = ''; });
function capture() {
  const original = Element.prototype.attachShadow;
  let root: ShadowRoot;
  vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function(this: Element, init) { root = original.call(this, init); return root; });
  return () => root!;
}
const payload: GatePayload = { mode: 'send', title: 'Review', items: [{ label: 'Name', value: '<img src=x onerror=alert(1)>', why: '', placeholder: 'PERSON_1' }], topics: [] };
it('renders a review without an iframe and treats findings as text', async () => {
 const root = capture(); const result = openGate(payload);
 expect(root().querySelector('iframe')).toBeNull();
 expect(root().querySelector('img')).toBeNull();
 expect(root().querySelector('strong')?.textContent).toBe(payload.items[0].value);
 root().querySelector<HTMLButtonElement>('.primary')!.click();
 expect(await result).toBe('primary');
 expect(document.querySelector('[data-promptshield=gate]')).toBeNull();
});
it('keeps original-send choice and Escape cancellation available for unreadable files', async () => {
 const root = capture(); const result = openGate({ ...payload, mode: 'cant_check', items: [], fileName: 'demo.bin' });
 expect(root().querySelector<HTMLButtonElement>('.primary')!.disabled).toBe(true);
 window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
 expect(await result).toBe('cancel');
});
