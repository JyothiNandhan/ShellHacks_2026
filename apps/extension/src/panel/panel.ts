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
  style.textContent = `
:host{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5;color-scheme:dark}*{box-sizing:border-box}
section{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5;background:#101013;border:1px solid #ffffff24;border-top:2px solid #ed1424;border-radius:18px;box-shadow:0 20px 60px #0008;overflow:hidden}
section[data-state="clear"]{border-top-color:#4fcb87}section[data-state="clear"] header{background:linear-gradient(120deg,#123123,#151b18)}section[data-state="clear"] .status{color:#a4edbf}section[data-state="checking"]{border-top-color:#a88b56}
header{display:flex;align-items:center;gap:8px;padding:15px;background:linear-gradient(120deg,#251216,#151518);border-bottom:1px solid #ffffff12}h2{font-size:15px;font-weight:750;letter-spacing:-.3px;margin:0;flex:1}h3{font-size:13px}
button{font:inherit;cursor:pointer;border:1px solid #ffffff25;border-radius:8px;padding:6px 10px;background:#242428;color:#fff;transition:background .18s,transform .18s}button:hover{background:#d90c1c;transform:translateY(-1px)}button:focus-visible{outline:2px solid #ff7580;outline-offset:2px}
.body{padding:14px;overflow:auto;max-height:calc(100vh - 170px)}.status{min-height:22px;color:#d9d5db;transition:color .2s}.status.checking{color:#ff8992}.status.checking:before{content:"";display:inline-block;width:6px;height:6px;margin-right:8px;border-radius:50%;background:#ff3345;animation:breathe 1s ease-in-out infinite}
.row{animation:detail-in .16s ease-out;padding:12px;margin-top:10px;border:1px solid #e72c393a;border-radius:12px;background:#1b1418}.label{font-weight:650;color:#ff98a0}.value{display:block;overflow-wrap:anywhere;margin:5px 0 9px;color:#fff}.pill{display:inline-block;background:#ed142416;color:#ffb0b6;border:1px solid #ed142450;border-radius:6px;padding:3px 7px;margin:0 6px 6px 0;font:11px ui-monospace,monospace}.dot{display:inline-block;width:6px;height:6px;margin-right:6px;background:#ff3345;border-radius:50%}p{font-size:12px;color:#aaa6b0;margin:6px 0}.topic{padding:10px;background:#23181a;border-radius:10px}details{margin-top:12px}summary{cursor:pointer}.all{margin-top:12px;width:100%;background:#e50914}footer{padding:0 14px 10px} @keyframes detail-in{from{opacity:.5;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}@keyframes breathe{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
  const box = node('section'); box.setAttribute('aria-label', 'Mind your Prompt');
  const header = node('header'); header.append(node('h2', 'Mind your Prompt'));
  const minimize = button('−', () => { minimized = !minimized; draw(); });
  const close = button('×', () => { hidden = true; draw(); }); close.setAttribute('aria-label', 'Hide until next input');
  header.append(minimize, close);
  const body = node('div', undefined, 'body');
  const status = node('div', '', 'status'); status.setAttribute('role', 'status');
  const content = node('div'); body.append(status, content); box.append(header, body); root.append(style, box);
  let signature = '';
  const draw = () => {
    host.hidden = hidden || !data;
    if (!data) return;
    const d = data;
    box.dataset.state = d.findings.length || d.topics.length ? "warning" : detecting || ai !== "ready" ? "checking" : "clear";
    minimize.textContent = minimized ? '+' : '−';
    minimize.setAttribute('aria-label', minimized ? 'Expand findings' : 'Minimize findings');
    body.hidden = minimized;
    const clear = ai === 'ready' ? 'No personal details found ✓' : ai === 'unavailable' ? 'Quick check complete · AI names unavailable' : 'Quick check complete · AI names loading';
    status.textContent = detecting ? 'Checking your prompt…' : d.findings.length ? `${d.findings.length} personal detail${d.findings.length === 1 ? '' : 's'} found` : ENGINE_STUB ? 'Preview checks only' : clear;
    status.className = `status${detecting ? ' checking' : ''}`;
    const nextSignature = JSON.stringify([d.findings, d.ignored, d.topics]);
    if (signature === nextSignature) return;
    signature = nextSignature;
    content.replaceChildren();
    {
      const body = content;
      if (ENGINE_STUB) body.append(node('p', 'Preview: email checks only. Other personal details are not detected yet. Use fake sample data.'));
      for (const f of d.findings) {
        const row = node('div', undefined, 'row'), label = node('div', undefined, 'label');
        label.append(node('span', '', `dot ${f.severity === 'low' ? 'low' : ''}`), node('span', EXPLANATIONS[f.type].label));
        row.append(label, node('span', secretTypes.has(f.type) ? maskValue(f.type, f.value) : f.value, 'value'), node('span', d.mapper.placeholderFor(f), 'pill'), button('Replace', () => { const latest = data?.findings.find(item => item.key === f.key && item.start === f.start); if (latest) data?.replace(latest); }));
        body.append(row);
      }
      if (d.findings.length > 1) { const all = button('Replace all', () => data?.replaceAll()); all.className = 'all'; body.append(all); }
      if (d.topics.length) {
        body.append(node('h3', 'Sensitive topics'));
        for (const topic of d.topics) { const row = node('div', undefined, 'topic'); row.append(node('strong', EXPLANATIONS[topic.topic].label), node('p', topic.sentence)); body.append(row); }
      }
      if (d.ignored.length) {
        const details = node('details'); details.append(node('summary', `Approved / Always allowed (${d.ignored.length})`));
        for (const f of d.ignored) {
          const row = node('div', undefined, 'row'); row.append(node('span', secretTypes.has(f.type) ? maskValue(f.type, f.value) : f.value, 'value'));
          if (f.allowlisted) row.append(node('p', 'Always allowed — change this in extension settings.'));
          else row.append(button('Undo', () => data?.undo(f)));
          details.append(row);
        }
        body.append(details);
      }
    }

  };
  return {
    render(next: PanelData) { data = next; detecting = false; draw(); },
    input() { hidden = false; detecting = true; draw(); },
    setAi(state: AiState) { if (ai !== state) { ai = state; draw(); } },
    clear() { data = undefined; draw(); },
    destroy() { host.remove(); },
  };
}
