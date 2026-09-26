import type { EntityType, PiiEvent } from './types';
const DAY = 86_400_000;
const cost: Record<EntityType, number> = { SSN: 15, CREDIT_CARD: 15, BANK: 15, API_KEY: 10, PASSWORD: 10, ADDRESS: 8, USER_TERM: 8, PHONE: 5, DATE_OF_BIRTH: 5, EMAIL: 3, PERSON: 2, IP_ADDRESS: 1, LOCATION: 1, ORGANIZATION: 1 };
export function computeScore(events: PiiEvent[], now = Date.now()): { score: number; daily: Array<{ date: string; score: number }> } {
  if (!Number.isFinite(now)) throw new Error('now must be a finite timestamp');
  const sorted = events.filter(e => Number.isFinite(e.ts) && e.ts <= now).slice().sort((a, b) => a.ts - b.ts);
  const today = Math.floor(now / DAY), first = sorted.length ? Math.floor(sorted[0].ts / DAY) : today;
  let score = 100, i = 0, previousDay = first - 1;
  const daily = [];
  // Sparse replay avoids walking years of empty days; UTC dates agree in every host.
  const days = new Set<number>(sorted.map(e => Math.floor(e.ts / DAY)));
  for (let day = today - 29; day <= today; day++) days.add(day);
  for (const day of [...days].sort((a, b) => a - b)) {
    if (day > first) score = Math.min(100, score + 2 * Math.max(0, day - Math.max(previousDay, first) - 1));
    let leaked = false;
    while (i < sorted.length && Math.floor(sorted[i].ts / DAY) === day) {
      const e = sorted[i++]; if (e.action === 'as_is') { score = Math.max(0, score - cost[e.type]); leaked = true; }
    }
    if (day > first && day < today && !leaked) score = Math.min(100, score + 2);
    if (day >= today - 29) daily.push({ date: new Date(day * DAY).toISOString().slice(0, 10), score });
    previousDay = day;
  }
  return { score, daily };
}
