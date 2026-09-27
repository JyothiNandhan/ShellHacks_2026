import type { GateChoice, GatePayload } from './api';
let closeActive: (() => void) | undefined;
export function cancelGate(): void { closeActive?.(); }

// Render inside the content script's closed shadow root. An embedded extension
// page can be blocked by the host site's frame policy, leaving review blank.
export async function openGate(payload: GatePayload): Promise<GateChoice> {
  cancelGate();
  const host = document.createElement('div');
  host.dataset.promptshield = 'gate';
  host.style.cssText = 'all:initial;position:fixed;top:16px;right:16px;width:min(420px,calc(100vw - 32px));height:min(640px,calc(100vh - 32px));z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host{color-scheme:dark}*{box-sizing:border-box}main{font:14px/1.5 system-ui,sans-serif;color:#f7f5f6;background:radial-gradient(ellipse at top right,#e5091426,transparent 65%),#101013;border:1px solid #ffffff25;border-top:3px solid #e50914;border-radius:20px;box-shadow:0 20px 70px #0009;height:100%;padding:22px;display:flex;flex-direction:column;gap:12px;animation:enter .2s ease-out}header{display:flex;justify-content:space-between;align-items:center}.brand{font-size:12px;color:#ff808b;font-weight:700}h1{font-size:25px;line-height:1.2;letter-spacing:-.7px;margin:0}p{margin:0;color:#beb8c1}.status{color:#ff9ca5;font-size:13px}.items{overflow:auto;flex:1;min-height:0}article{background:#1b171c;border:1px solid #ffffff20;border-left:3px solid #e50914;border-radius:12px;padding:13px;margin-bottom:10px;overflow-wrap:anywhere}strong{display:block;font-size:16px}.label{display:block;color:#bcb5c0;font-size:12px;margin:3px 0 8px}.placeholder{display:inline-block;background:#142b1c;border:1px solid #497e57;color:#b4edc3;border-radius:6px;padding:3px 7px;font:12px monospace}button{font:inherit;cursor:pointer;border-radius:9px;padding:10px 14px;transition:background .15s,transform .15s;color:#fff;border:1px solid #ffffff25;background:#242126}button:hover{background:#373038}button:active{transform:scale(.98)}button:focus-visible{outline:2px solid #ff8590;outline-offset:3px}.close{padding:2px 10px;font-size:23px}.primary{background:#e50914;border-color:#e50914;font-weight:700}.primary:hover{background:#ff2532}button:disabled{opacity:.4;cursor:not-allowed}footer{display:grid;gap:8px;border-top:1px solid #ffffff20;padding-top:12px}footer p{font-size:11px}@keyframes enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  `;
  shadow.append(style);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const main = el('main'); main.setAttribute('role', 'dialog'); main.setAttribute('aria-modal', 'true'); main.setAttribute('aria-label', 'Mind your Prompt privacy review');
  const header = el('header'); const close = el('button', '×', 'close'); close.setAttribute('aria-label', 'Cancel');
  header.append(el('span', '◈ Mind your Prompt', 'brand'), close);
  main.append(header, el('h1', 'Mind your Prompt'), el('p', payload.items.length ? `${payload.items.length} personal details found · review before sharing` : payload.title, 'status'));
  const items = el('section', undefined, 'items'); items.setAttribute('aria-label', 'Review findings');
  if (payload.fileName) items.append(el('p', payload.fileName));
  if (payload.mode === 'cant_check') items.append(el('p', `Can’t check this file: ${payload.reason ?? 'This format is unsupported.'}`));
  else if (payload.reason) items.append(el('p', payload.reason));
  if (!payload.items.length && payload.mode !== 'cant_check') items.append(el('p', 'No personal details need replacement. Both choices send the reviewed content.'));
  for (const item of payload.items) {
    const article = el('article'); article.append(el('strong', item.value), el('span', item.label, 'label'), el('span', item.placeholder, 'placeholder')); items.append(article);
  }
  for (const topic of payload.topics) { const article = el('article'); article.append(el('strong', topic.label), el('p', topic.snippet)); items.append(article); }
  if (payload.topics.length) items.append(el('p', 'Renaming personal details does not remove sensitive topics.'));
  const footer = el('footer'); const primary = el('button', 'Replace and send', 'primary'); primary.disabled = payload.mode === 'cant_check';
  const secondary = el('button', 'Send as is'); footer.append(el('p', 'Checked on your device. You choose what to share.'), primary, secondary); main.append(items, footer); shadow.append(main);
  return new Promise<GateChoice>(resolve => {
    let finished = false;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const finish = (choice: GateChoice) => {
      if (finished) return; finished = true;
      clearTimeout(timeout); window.removeEventListener('keydown', onKey, true); window.removeEventListener('pagehide', cancel);
      host.remove(); if (closeActive === cancel) closeActive = undefined;
      previous?.focus(); resolve(choice);
    };
    const cancel = () => finish('cancel');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
      if (event.key === 'Tab') {
        const buttons = [...shadow.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const index = buttons.indexOf(shadow.activeElement as HTMLButtonElement);
        event.preventDefault(); event.stopImmediatePropagation(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
    };
    const timeout = setTimeout(cancel, 10 * 60_000);
    close.onclick = cancel; primary.onclick = () => finish('primary'); secondary.onclick = () => finish('secondary');
    closeActive = cancel; window.addEventListener('keydown', onKey, true); window.addEventListener('pagehide', cancel, { once: true });
    document.documentElement.append(host); (primary.disabled ? secondary : primary).focus();
  });
}
