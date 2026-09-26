import { EXPLANATIONS, maskValue, type Finding, type PlaceholderMapper, type TopicFlag } from '@promptshield/engine';
import type { AiState } from '../messages';
import { ENGINE_STUB } from '../engineStatus';
import { button, node, shadowHost } from '../ui';
export interface PanelData {
  findings: Finding[]; ignored: Finding[]; topics: TopicFlag[]; mapper: PlaceholderMapper;
  replace(finding: Finding): void; replaceAll(): void; undo(finding: Finding): void;
}
const secretTypes = new Set(['SSN', 'CREDIT_CARD', 'BANK', 'PASSWORD', 'API_KEY']);
export function createPanel() {
  const { host, root } = shadowHost('panel', 'position:fixed;top:16px;right:16px;width:min(320px,calc(100vw - 32px));max-height:calc(100vh - 32px);z-index:2147483645;');
  let hidden = false, minimized = false, detecting = false;
  let ai: AiState = 'idle';
  let data: PanelData | undefined;
  const style = node('style');
  style.textContent = ':host{font:13px/1.45 system-ui;color:#20352c;color-scheme:light}*{box-sizing:border-box}section{background:#fff;border:1px solid #d9e2d5;border-radius:14px;box-shadow:0 8px 36px #0002;overflow:hidden}header{padding:12px;display:flex;align-items:center;gap:5px;background:#f4f8f0}h2{font-size:14px;margin:0;flex:1}h3{font-size:13px;margin:12px 0 6px}button{font:inherit;background:#f1f6ec;border:1px solid #becdaf;border-radius:6px;padding:4px 7px;cursor:pointer;color:#27500a}button:focus-visible,a:focus-visible{outline:2px solid #315e26;outline-offset:2px}.body{padding:12px;overflow-y:auto;max-height:calc(100vh - 165px)}.status{color:#64735f;font-size:12px}.row{padding:10px 0;border-bottom:1px solid #e7ece4}.label{font-weight:650}.value{overflow-wrap:anywhere;display:block;margin:4px 0}.pill{display:inline-block;background:#eaf3de;border:1px solid #3b6d11;border-radius:5px;color:#27500a;padding:1px 5px;font-size:11px;margin-right:5px;overflow-wrap:anywhere}p{margin:5px 0;color:#61705c;font-size:12px}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:#e24b4a}.low{background:#ef9f27}details{margin-top:12px;color:#74806e}summary{cursor:pointer}.topic{background:#fff7e7;padding:8px;border-radius:6px;margin-top:6px}footer{padding:10px 12px;border-top:1px solid #e7ece4;font-size:11px}a{color:#315e26;text-decoration:none}.all{margin-top:10px}';
  style.textContent += `
:host{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5;color-scheme:dark}
section{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5;background:#111114;border:1px solid #ffffff20;border-radius:16px;box-shadow:0 16px 56px #0009;animation:panel-in .2s ease}
header{background:#1b1b20;border-bottom:1px solid #ffffff12;padding:14px;gap:8px}h2{color:#fafafa;font-size:13px;letter-spacing:-.2px;font-weight:700}
button{background:#25252d;color:#eee;border:1px solid #ffffff20;border-radius:7px;padding:6px 10px;transition:background .18s,transform .18s}button:hover{background:#e50914;color:#fff;transform:translateY(-1px)}button:active{transform:scale(.96)}button:focus-visible{outline:2px solid #ff5962}
.body{padding:14px}.status{color:#d0ccd5;font-size:12px}.row{border-color:#ffffff15}.label{color:#fff}.value{color:#e9e5ed}p{color:#aaa8b3}.pill{background:#e509141c;border-color:#e5091470;color:#ff9fa5}.dot{background:#e50914}.low{background:#e8bb62}.topic{background:#e8bb6212;color:#e8bb62}details{color:#b4b0bc}footer{border-color:#ffffff15;padding:9px 14px}.all{background:#e50914;color:#fff;width:100%}
@keyframes panel-in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){section{animation:none}button{transition:none}}
`;
  const draw = () => {
    host.hidden = hidden || !data;
    root.replaceChildren(style);
    if (!data) return;
    const d = data;
    const box = node('section'); box.setAttribute('aria-label', 'PromptShield personal information');
    const header = node('header'); header.append(node('h2', 'Personal information entered'));
    const minimize = button(minimized ? '+' : '−', () => { minimized = !minimized; draw(); }); minimize.setAttribute('aria-label', minimized ? 'Expand findings' : 'Minimize findings');
    const close = button('×', () => { hidden = true; draw(); }); close.setAttribute('aria-label', 'Hide until next input');
    header.append(minimize, close); box.append(header);
    if (!minimized) {
      const body = node('div', undefined, 'body');
      // "All clear" only once the AI name check has run; the quick rules alone miss names like "Rohith".
      const clear = ai === 'ready' ? 'All clear ✓' : ai === 'unavailable' ? 'Nothing found by the quick check. AI name check unavailable, so names may be missed.' : 'Nothing found by the quick check. AI name check still loading, so names may be missed.';
      const status = node('div', detecting ? 'Detecting…' : d.findings.length ? `${d.findings.length} items` : ENGINE_STUB ? 'No email findings (preview)' : clear, 'status'); status.setAttribute('role', 'status'); body.append(status);
      if (ENGINE_STUB) body.append(node('p', 'Preview: email checks only. Other personal details are not detected yet. Use fake sample data.'));
      for (const f of d.findings) {
        const row = node('div', undefined, 'row'), label = node('div', undefined, 'label');
        label.append(node('span', '', `dot ${f.severity === 'low' ? 'low' : ''}`), node('span', EXPLANATIONS[f.type].label));
        row.append(label, node('span', secretTypes.has(f.type) ? maskValue(f.type, f.value) : f.value, 'value'), node('span', d.mapper.placeholderFor(f), 'pill'), button('Replace', () => d.replace(f)), node('p', EXPLANATIONS[f.type].why));
        body.append(row);
      }
      if (d.findings.length > 1) { const all = button('Replace all', d.replaceAll); all.className = 'all'; body.append(all); }
      if (d.topics.length) {
        body.append(node('h3', 'Sensitive topics'));
        for (const topic of d.topics) { const row = node('div', undefined, 'topic'); row.append(node('strong', EXPLANATIONS[topic.topic].label), node('p', topic.sentence), node('p', EXPLANATIONS[topic.topic].why)); body.append(row); }
      }
      if (d.ignored.length) {
        const details = node('details'); details.append(node('summary', `Approved / Always allowed (${d.ignored.length})`));
        for (const f of d.ignored) {
          const row = node('div', undefined, 'row'); row.append(node('span', secretTypes.has(f.type) ? maskValue(f.type, f.value) : f.value, 'value'));
          if (f.allowlisted) row.append(node('p', 'Always allowed — change this in extension settings.'));
          else row.append(button('Undo', () => d.undo(f)));
          details.append(row);
        }
        body.append(details);
      }
      box.append(body);
      const footer = node('footer');
      if (ai === 'loading') footer.append(node('p', 'Loading the AI model (first time only)…'));
      if (ai === 'unavailable') footer.append(node('p', 'AI name detection unavailable'));
      if (footer.childNodes.length) box.append(footer);
    }
    root.append(box);
  };
  return {
    render(next: PanelData) { data = next; detecting = false; draw(); },
    input() { hidden = false; detecting = true; draw(); },
    setAi(state: AiState) { ai = state; draw(); },
    clear() { data = undefined; draw(); },
    destroy() { host.remove(); },
  };
}
