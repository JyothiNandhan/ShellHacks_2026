import type { Finding, PlaceholderMapper } from '@promptshield/engine';
import { buildTextModel, rangeFor } from '../editor/textModel';
import type { Editor } from '../sites';
import { button, shadowHost } from '../ui';
const mirrored = ['boxSizing', 'width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch', 'letterSpacing', 'wordSpacing', 'lineHeight', 'textTransform', 'textIndent', 'textAlign', 'tabSize', 'direction', 'wordBreak'] as const;
// Textareas have no text nodes, so spans are measured in an invisible copy with the same box, font, wrapping and scroll.
function textareaMirror(area: HTMLTextAreaElement, parent: ShadowRoot) {
  const style = getComputedStyle(area), box = area.getBoundingClientRect();
  const mirror = document.createElement('div');
  mirror.style.cssText = `position:fixed;left:${box.left}px;top:${box.top}px;visibility:hidden;overflow:hidden;white-space:pre-wrap;overflow-wrap:break-word;border-color:transparent;`;
  for (const prop of mirrored) mirror.style[prop] = style[prop];
  const scrollbar = area.offsetWidth - area.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
  if (scrollbar > 0) mirror.style.paddingRight = `${parseFloat(style.paddingRight) + scrollbar}px`;
  const text = document.createTextNode(`${area.value} `);   // trailing space keeps a final newline measurable
  mirror.append(text); parent.append(mirror);
  mirror.scrollTop = area.scrollTop; mirror.scrollLeft = area.scrollLeft;
  return {
    rects(start: number, end: number): DOMRect[] { const range = document.createRange(); range.setStart(text, start); range.setEnd(text, end); return [...range.getClientRects()]; },
    remove: () => mirror.remove(),
  };
}
export function createOverlay() {
  const { host, root } = shadowHost('overlay', 'position:fixed;inset:0;pointer-events:none;z-index:2147483646;');
  let pending = 0;
  let lastSignature = "";
  let data: { editor: Editor; findings: Finding[]; mapper: PlaceholderMapper; replace: (finding: Finding) => void } | undefined;
  const draw = () => {
    pending = 0; root.replaceChildren();
    if (!data || !data.editor.isConnected) return;
    const { editor, findings, mapper, replace } = data;
    const signature = JSON.stringify(findings.map(f => [f.type, f.key, f.start, f.end]));
    const animate = signature !== lastSignature; lastSignature = signature;
    const model = buildTextModel(editor);
    const mirror = editor instanceof HTMLTextAreaElement ? textareaMirror(editor, root) : undefined;
    const spanRects = (start: number, end: number) => mirror ? mirror.rects(start, end) : [...(rangeFor(model, start, end)?.getClientRects() ?? [])];
    const box = editor.getBoundingClientRect();
    const left = Math.max(0, box.left), top = Math.max(0, box.top), right = Math.min(innerWidth, box.right), bottom = Math.min(innerHeight, box.bottom);
    const chips: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    for (const finding of findings) {
      if (model.text.slice(finding.start, finding.end) !== finding.value) continue;
      const rects = spanRects(finding.start, finding.end).filter(r => r.width && r.height && r.right > left && r.left < right && r.bottom > top && r.top < bottom);
      for (const rect of rects) {
        const mark = document.createElement('div');
        const x = Math.max(left, rect.left), y = Math.min(bottom - 2, rect.bottom - 1);
        if (y < top) continue;
        mark.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${Math.max(0, Math.min(right, rect.right) - x)}px;height:2px;background:#ff2638;pointer-events:none;`;
        root.append(mark);
      }
      const first = rects[0]; if (!first || right <= left) continue;
      const label = mapper.placeholderFor(finding);
      const width = Math.min(innerWidth - 16, Math.max(80, label.length * 7.5 + 28));
      const x = Math.max(8, Math.min(first.left, innerWidth - width - 8));
      // Keep replacement controls outside the composer; never cover typed text.
      let y = box.top - 34;
      while (chips.some(c => x < c.right && x + width > c.left && y < c.bottom && y + 26 > c.top)) y -= 30;
      if (y < 8) {
        y = box.bottom + 8;
        while (chips.some(c => x < c.right && x + width > c.left && y < c.bottom && y + 26 > c.top)) y += 30;
      }
      if (y + 26 > innerHeight - 8) continue;
      chips.push({ left: x, top: y, right: x + width, bottom: y + 26 });
      const chip = button(label, () => replace(finding));
      chip.title = `Replace ${finding.type.toLowerCase().replaceAll('_', ' ')} with ${label}`;
      chip.setAttribute('aria-label', chip.title);
      chip.style.cssText = `all:initial;position:fixed;left:${x}px;top:${y}px;max-width:${width}px;height:26px;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 12px/24px system-ui;color:#bff5cc;background:#153522;border:1px solid #5ea371;border-radius:8px;padding:0 10px;box-shadow:0 4px 14px #0005;transition:background .16s,box-shadow .16s;pointer-events:auto;cursor:pointer;`;
      chip.addEventListener('mouseenter', () => { chip.style.background = '#245336'; });
      chip.addEventListener('mouseleave', () => { chip.style.background = '#153522'; });
      root.append(chip);
      if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) chip.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
    }
    mirror?.remove();
  };
  const reposition = () => { if (!pending) pending = requestAnimationFrame(draw); };
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
  return {
    render(editor: Editor, findings: Finding[], mapper: PlaceholderMapper, replace: (finding: Finding) => void) { data = { editor, findings, mapper, replace }; reposition(); },
    reposition,
    clear() { data = undefined; root.replaceChildren(); },
    destroy() { cancelAnimationFrame(pending); window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); host.remove(); },
  };
}
