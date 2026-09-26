import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_SETTINGS, EXPLANATIONS, type EntityType, type Site } from '@promptshield/engine';
import { activityStats, type Activity, type ActivityRecord } from '../../src/activity';
import { request } from '../../src/messages';
import { Shell } from '../../src/shared-ui/components';
import { siteNames } from '../../src/shared-ui/data';
import { preview } from '../../src/shared-ui/storage';
import '../../src/shared-ui/style.css';
import './style.css';

interface Answer { answer: string; citations: Array<{ url: string; title?: string }>; source: 'snowflake' | 'unavailable'; reason?: string }
function Dashboard() {
  const [activity, setActivity] = useState<Activity>();
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [progress, setProgress] = useState(''), [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState(''), [tool, setTool] = useState<Site>('chatgpt');
  const [answer, setAnswer] = useState<Answer>(), [asking, setAsking] = useState(false);
  const worker = useRef<Worker | null>(null), fileInput = useRef<HTMLInputElement>(null), questionVersion = useRef(0);
  useEffect(() => {
    if (preview) return;
    let alive = true;
    const refresh = () => void request<Activity>({ type: 'ACTIVITY_GET' }).then(a => { if (alive) { setActivity(a); if (a.records.length) setNotice(n => n.startsWith('Reset complete') ? '' : n); } }, () => { if (alive) setError('Could not load activity. Reopen the dashboard.'); });
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => { if (area === 'local' && changes.activity) refresh(); };
    refresh(); chrome.storage.onChanged.addListener(changed);
    return () => { alive = false; questionVersion.current++; worker.current?.terminate(); chrome.storage.onChanged.removeListener(changed); };
  }, []);
  if (preview) return <main className="installation-required"><h1>Mind your Prompt!</h1><p>Install the Chrome extension, then open its dashboard from the extension icon.</p></main>;
  const stats = activity ? activityStats(activity) : null;
  const stopImport = () => { worker.current?.terminate(); worker.current = null; setBusy(false); setProgress(''); if (fileInput.current) fileInput.current.value = ''; };
  async function reset() {
    if (!confirm('Reset all conversation counts, disclosure counts, imports and score? Your settings will stay saved.')) return;
    stopImport(); questionVersion.current++; setAnswer(undefined); setAsking(false); setError('');
    try { setActivity(await request<Activity>({ type: 'ACTIVITY_RESET' })); setNotice('Reset complete: 0 conversations, 0 shared details, 0 categories, score 100.'); }
    catch { setError('Reset failed. Please try again.'); }
  }
  async function importFile(file?: File) {
    if (!file || !activity) return;
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 25 * 1024 * 1024) { setError('Choose a JSON export no larger than 25 MB.'); return; }
    setBusy(true); setError(''); setNotice(''); setProgress('Reading your export locally…');
    const epoch = activity.epoch;
    let settings;
    try { settings = (await chrome.storage.local.get('settings')).settings ?? DEFAULT_SETTINGS; }
    catch { setError('Could not read your settings. Please try again.'); stopImport(); return; }
    const job = new Worker(new URL('../../src/history.worker.ts', import.meta.url), { type: 'module' }); worker.current = job;
    job.onerror = () => { setError('Could not scan this export. No activity was added.'); stopImport(); };
    job.onmessage = async event => {
      if (worker.current !== job) return;
      if (event.data.type === 'progress') setProgress(`Checking ${event.data.done.toLocaleString()} of ${event.data.total.toLocaleString()} messages…`);
      if (event.data.type === 'error') { setError(event.data.message); stopImport(); }
      if (event.data.type === 'done') {
        try {
          const result = await request<{ activity: Activity; added: number }>({ type: 'ACTIVITY_IMPORT', epoch, records: event.data.records as ActivityRecord[] });
          if (worker.current !== job) return;
          setActivity(result.activity); setNotice(result.added ? `Added ${result.added.toLocaleString()} user messages. Previously counted messages were skipped.` : 'This history is already counted. Your totals have not changed.');
        } catch { setError('The import could not be saved, or activity was reset while it was running. No partial import was saved.'); }
        finally { if (worker.current === job) stopImport(); }
      }
    };
    job.postMessage({ file, settings });
  }
  async function ask(event: React.FormEvent) {
    event.preventDefault(); const version = ++questionVersion.current; setAsking(true); setAnswer(undefined); setError('');
    try { const result = await request<Answer>({ type: 'REGULATORY_QUESTION', tool, question }); if (version === questionVersion.current) setAnswer(result); }
    catch { if (version === questionVersion.current) setError('Could not reach privacy answers. Start the local web server, or check the configured API address.'); }
    finally { if (version === questionVersion.current) setAsking(false); }
  }
  return <Shell page="dashboard">
    <header className="heading"><div><div className="eyebrow">YOUR AI PRIVACY, ON YOUR DEVICE</div><h1>Mind your Prompt!</h1><p>A clear view of what you have shared with ChatGPT, Gemini and Claude.</p></div><span className="pill">Stored locally</span></header>
    {error && <div className="error" role="alert">{error}</div>}
    {!stats ? <p role="status">Loading your activity…</p> : <>
      <section className="tiles metric-grid" aria-label="Your privacy totals">{[
        ['Conversations', stats.conversations, 'Unique chats with an AI tool'],
        ['Personal details shared', stats.shared, 'Individual details actually sent'],
        ['Categories shared', stats.categories, 'Distinct types of personal information'],
        ['Privacy score', stats.score, 'Out of 100 — higher is better'],
      ].map(([label, value, note]) => <article className="card metric" key={label}><div className="tile-label">{label}</div><div className="tile-value">{Number(value).toLocaleString()}</div><div className="tile-note">{note}</div></article>)}</section>
      <div className="reset-row"><p>Detected or replaced details are not counted as disclosures. Always-allowed details still count when sent.</p><button className="btn" onClick={() => void reset()}>Reset everything</button></div>
      <section className="card history-card"><div><div className="eyebrow">BRING YOUR HISTORY</div><h2>Import a conversation export</h2><p>Select the JSON file you exported from ChatGPT, Claude or Gemini. It is read on this device and never uploaded.</p></div><label className="import-zone"><span aria-hidden="true">↥</span><strong>{busy ? 'Checking your history…' : 'Choose a JSON export'}</strong><span>JSON · up to 25 MB</span><input ref={fileInput} type="file" accept=".json,application/json" disabled={busy} aria-label="Import conversation JSON" onChange={event => void importFile(event.target.files?.[0])}/></label>{busy && <div className="actions"><p role="status">{progress}</p><button className="btn" onClick={stopImport}>Cancel import</button></div>}<p className="method-note">History scans use local rules and name dictionaries. Detection is best effort; these counts are detected disclosures, not a guarantee that every detail was found. Gemini activity without a thread ID is counted as a separate conversation.</p></section>
      {notice && <p role="status" className="notice">{notice}</p>}
      <section className="card summary-card"><h2>Your sharing summary</h2><p>You have had <strong>{stats.conversations.toLocaleString()} conversations</strong> with AI tools and shared <strong>{stats.shared.toLocaleString()} personal details</strong> across <strong>{stats.categories} categories</strong>.</p><div className="category-list">{Object.entries(stats.counts).map(([type, count]) => <span className="category-count" key={type}>{EXPLANATIONS[type as EntityType].label}<strong>{count}</strong></span>)}{!stats.shared && <p>No personal-information disclosures recorded. Your score starts at 100.</p>}</div><details><summary>How the score works</summary><p>Starts at 100. Each shared SSN, card or bank detail costs 15 points; API key or password 10; address or private term 8; phone or birth date 5; email 3; name 2; IP address, place or organization 1. Replacements cost zero. Reset restores 100. A conversation means a unique chat, not each message.</p></details></section>
    </>}
    <section className="card questions-card"><div className="eyebrow">UNDERSTAND YOUR CHOICES</div><h2>What happens to my data?</h2><p>Ask a privacy or regulatory question. Answers use official policies retrieved through Snowflake, with links to the supporting sources.</p><form onSubmit={event => void ask(event)}><label>AI tool<select value={tool} onChange={e => setTool(e.target.value as Site)}>{Object.entries(siteNames).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label><label>Your question<textarea value={question} onChange={e => setQuestion(e.target.value)} minLength={5} maxLength={1000} required rows={3} placeholder="What happens to data I share, and how can I delete it?"/></label><p className="method-note">Only this question and the selected tool are sent to our server and Snowflake. Your export, dashboard activity and chat messages stay here. Keep personal details out of the question.</p><button className="btn btn-primary" disabled={asking}>{asking ? 'Looking up policy sources…' : 'Ask a privacy question'}</button></form>{answer && <article className="answer" aria-live="polite"><span className="pill">{answer.source === 'snowflake' ? 'Snowflake · cited policy answer' : 'Answer unavailable'}</span><p>{answer.answer}</p>{answer.citations.map(c => <a key={c.url} href={c.url} target="_blank" rel="noreferrer">{c.title || new URL(c.url).hostname} ↗</a>)}</article>}</section>
  </Shell>;
}
createRoot(document.getElementById('root')!).render(<Dashboard/>);
