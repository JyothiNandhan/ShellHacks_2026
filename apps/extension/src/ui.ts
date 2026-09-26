export function shadowHost(kind: string, css: string): { host: HTMLDivElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.dataset.promptshield = kind;
  host.style.cssText = `all:initial;${css}`;
  const root = host.attachShadow({ mode: 'closed' });
  document.documentElement.append(host);
  return { host, root };
}
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
export function button(label: string, fn: () => void): HTMLButtonElement {
  const element = node('button', label);
  element.type = 'button';
  element.addEventListener('mousedown', event => event.preventDefault());
  element.addEventListener('click', fn);
  return element;
}
export function toast(message: string, copyText?: string): void {
  const { host, root } = shadowHost('notice', 'position:fixed;bottom:24px;right:24px;z-index:2147483647;max-width:360px;');
  const style = node('style');
  style.textContent = ':host{font:14px system-ui;color:#20352c}section{background:white;padding:16px;border:1px solid #b8c8b4;border-radius:12px;box-shadow:0 8px 32px #0003}button{margin-top:8px;padding:8px;border:1px solid #3b6d11;border-radius:6px;background:#eaf3de;cursor:pointer}p{margin:0}';
  const box = node('section'); box.setAttribute('role', 'status'); box.append(node('p', message));
  if (copyText !== undefined) box.append(button('Copy safe version', () => {
    void navigator.clipboard.writeText(copyText).then(() => { box.replaceChildren(node('p', 'Copied. Press Ctrl+V to insert.')); }, () => { box.replaceChildren(node('p', 'Clipboard access failed. Select and copy the safe version below.')); const area = node('textarea'); area.value = copyText; area.readOnly = true; box.append(area); area.focus(); area.select(); });
  }));
  box.append(button('Dismiss', () => host.remove())); root.append(style, box);
  if (copyText === undefined) setTimeout(() => host.remove(), 7000);
}
