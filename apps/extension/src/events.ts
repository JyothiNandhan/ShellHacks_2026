import type { Finding, EventSource, EventAction } from '@promptshield/engine';
import { request } from './messages';
import { siteAdapter } from './sites';
export async function logEvents(findings: Finding[], source: EventSource, action: EventAction): Promise<void> {
  const adapter = siteAdapter();
  if (!adapter || !findings.length) return;
  // The background receives only these fields, never text or normalized values.
  await request({ type: 'LOG_EVENTS', events: findings.map(f => ({ type: f.type, site: adapter.id, source, action, ts: Date.now() })) });
}
