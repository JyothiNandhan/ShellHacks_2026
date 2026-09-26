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
  let data: { editor: Editor; findings: Finding[]; mapper: PlaceholderMapper; replace: (finding: Finding) => void } | undefined;
  const draw = () => {
    pending = 0; root.replaceChildren();
    if (!data || !data.editor.isConnected) return;
    const { editor, findings, mapper, replace } = data;
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
        mark.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${Math.max(0, Math.min(right, rect.right) - x)}px;height:2px;background:${finding.severity === 'low' ? '#EF9F27' : '#E24B4A'};pointer-events:none;`;
        root.append(mark);
      }
      const first = rects[0]; if (!first || right <= left) continue;
      const label = mapper.placeholderFor(finding);
      const width = Math.min(right - left, Math.max(48, label.length * 6.5 + 12));
      const x = Math.max(left, Math.min(first.left, right - width));
      let y = Math.max(top, first.top - 18);
      while (chips.some(c => x < c.right && x + width > c.left && y < c.bottom && y + 17 > c.top)) y -= 18;
      // Underlines remain visible when there is no room for a chip inside the editor.
      if (y < top || y + 17 > bottom) continue;
      chips.push({ left: x, top: y, right: x + width, bottom: y + 17 });
      const chip = button(label, () => replace(finding));
      chip.title = `Replace ${finding.type.toLowerCase().replaceAll('_', ' ')} with ${label}`;
      chip.setAttribute('aria-label', chip.title);
      chip.style.cssText = `all:initial;position:fixed;left:${x}px;top:${y}px;max-width:${width}px;height:16px;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:11px/14px system-ui;color:#27500A;background:#EAF3DE;border:1px solid #3B6D11;border-radius:4px;padding:0 4px;pointer-events:auto;cursor:pointer;`;
      root.append(chip);
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
