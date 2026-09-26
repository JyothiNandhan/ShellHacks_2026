import type { Finding } from '@promptshield/engine';
import { contextKey } from './storage';
import { request } from './messages';
const cache = new Map<string, Set<string>>();
export const peekApprovals = () => cache.get(contextKey());
export const invalidateApprovals = () => cache.clear();
export const approvalKey = (f: Finding) => `${f.type}|${f.key}`;
export async function getApprovals(): Promise<Set<string>> {
  const key = contextKey();
  const values = new Set(await request<string[]>({ type: 'SESSION_GET', key: `approved:${key}` }) ?? []);
  cache.set(key, values);
  return values;
}
export async function approve(findings: Finding[]): Promise<void> {
  const key = contextKey();
  await request({ type: 'APPROVAL_UPDATE', key: `approved:${key}`, add: findings.map(approvalKey) });
  // A missing cache stays missing until the full set is fetched.
  const values = cache.get(key);
  findings.forEach(f => values?.add(approvalKey(f)));
}
export async function undoApproval(finding: Finding): Promise<void> {
  const key = contextKey();
  await request({ type: 'APPROVAL_UPDATE', key: `approved:${key}`, remove: [approvalKey(finding)] });
  cache.get(key)?.delete(approvalKey(finding));
}
