'use client';
import { useEffect, useState, type ReactNode } from 'react';
export default function ExtensionAccess({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.source === window && event.origin === location.origin && event.data?.source === 'mindyourprompt-extension' && event.data.type === 'READY') setInstalled(true); };
    const ping = () => window.postMessage({ source: 'mindyourprompt-website', type: 'PING' }, location.origin);
    window.addEventListener('message', receive); ping(); const retry = setInterval(ping, 1000);
    return () => { clearInterval(retry); window.removeEventListener('message', receive); };
  }, []);
  return <section className="section"><div className="section-heading"><div><span className="eyebrow">YOUR EXTENSION DASHBOARD</span><h1>Mind your Prompt!</h1><p>Your conversations, shared details, categories and privacy score live in the Chrome extension.</p></div></div>{installed ? <div className="privacy-banner"><div><h2>Your extension is connected.</h2><p>Open your dashboard to import a JSON export, see your totals, reset activity, or ask a cited privacy question.</p></div><button className="button primary" onClick={() => window.postMessage({ source: 'mindyourprompt-website', type: 'OPEN_DASHBOARD' }, location.origin)}>Open my dashboard ↗</button></div> : <><div className="privacy-banner"><div><h2>Install the extension to get started.</h2><p>Your dashboard becomes available when the extension is installed. It starts at 0 conversations, 0 shared details, 0 categories and a privacy score of 100. After installing, reload this page or open the extension icon.</p></div></div>{children}</>}</section>;
}
