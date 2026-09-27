import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GateChoice, GatePayload } from '../../src/api';
import { request } from '../../src/messages';
import { ENGINE_STUB } from '../../src/engineStatus';
import './style.css';
const gateId = new URLSearchParams(location.search).get('id');
const labels = { paste: ['Replace and send', 'Send as is'], file: ['Replace and send', 'Send as is'], send: ['Replace and send', 'Send as is'], cant_check: ['', 'Send as is'] };
function Gate() {
  const [payload, setPayload] = useState<GatePayload>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  const choose = async (choice: GateChoice) => {
    if (busy) return;
    setBusy(true);
    try { await request({ type: 'GATE_CHOICE', gateId, choice }); }
    catch { setError('This review expired. Press Escape in the page and try again.'); setBusy(false); }
  };
  useEffect(() => {
    void request<GatePayload>({ type: 'GATE_GET', gateId }).then(setPayload, () => setError('This review expired. Close it and try again.'));
  }, []);
  useEffect(() => { primary.current?.focus(); }, [payload]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); void choose('cancel'); }
      if (event.key === 'Tab') {
        const buttons = [...document.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const next = (buttons.indexOf(document.activeElement as HTMLButtonElement) + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        event.preventDefault(); buttons[next]?.focus();
      }
    };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  });
  return <main role="dialog" aria-modal="true" aria-labelledby="title">
    <header><span className="brand">◈ Mind your Prompt</span><button className="close" aria-label="Cancel" disabled={busy} onClick={() => void choose('cancel')}>×</button></header>
    <h1 id="title">Mind your Prompt</h1>
    {payload && <p className="review-status">{payload.items.length ? `${payload.items.length} personal detail${payload.items.length === 1 ? "" : "s"} found · review before sharing` : payload.title}</p>}
    {ENGINE_STUB && <p role="note">Preview: email checks only. Other personal details are not detected yet.</p>}
    {error && <p role="alert">{error}</p>}
    {!payload && !error && <p role="status">Checking locally…</p>}
    {payload && <>
      <section className="items" aria-label="Review findings">
        {payload.mode !== 'cant_check' && !payload.items.length && <p>No personal details need replacement. Both choices send the reviewed content.</p>}
        {payload.reason && payload.mode !== 'cant_check' && <p>{payload.reason}</p>}
        {payload.mode === 'cant_check' && <p>Can’t check {payload.fileName ?? 'this file'}: {payload.reason ?? 'This format is unsupported.'}</p>}
        {payload.fileName && payload.mode !== 'cant_check' && <p className="filename">{payload.fileName}</p>}
        {payload.items.map((item, index) => <article key={index}><strong>{item.value}</strong><span className="label">{item.label}</span><span className="placeholder">{item.placeholder}</span></article>)}
        {!!payload.topics.length && <><h2>Sensitive topics</h2>{payload.topics.map((topic, index) => <article className="topic" key={index}><strong>{topic.label}</strong><p>{topic.snippet}</p></article>)}<p>Renaming personal details does not remove sensitive topics.</p></>}
      </section>
      <footer><p>Checked on your device. You choose what to share.</p>
        <button ref={payload.mode !== 'cant_check' ? primary : undefined} className="primary" disabled={busy || payload.mode === 'cant_check'} title={payload.mode === 'cant_check' ? 'Replacement is unavailable because this file could not be read.' : undefined} onClick={() => void choose('primary')}>Replace and send</button>
        <button ref={payload.mode === 'cant_check' ? primary : undefined} className="secondary" disabled={busy} onClick={() => void choose('secondary')}>{labels[payload.mode][1]}</button>
      </footer>
    </>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Gate />);
