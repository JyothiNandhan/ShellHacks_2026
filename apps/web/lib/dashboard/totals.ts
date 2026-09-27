import type { ScanReport } from '../report/types';
import type { LiveStats } from './liveStats';

/** The export is a baseline; live stats are filtered to sends after the scan began. */
export function dashboardTotals(report: ScanReport | null, live: LiveStats | null) {
  const categories = new Set([...Object.keys(report?.countsByType ?? {}), ...(live?.categories ?? [])]);
  return {
    messages: (report?.messageCount ?? 0) + (live?.prompts ?? 0),
    findings: (report?.findingCount ?? 0) + (live?.shared ?? 0),
    categories: categories.size,
    score: Math.max(0, (report?.privacyScore ?? 100) - (live?.cost ?? (100 - (live?.score ?? 100)))),
  };
}
