import { detectFast, type DetectionResult, type Finding } from '@promptshield/engine';
import type { Extracted } from '@promptshield/engine/files';
import { getMapper, getSettings, isPlaceholder, settingsSnapshot } from './storage';
import { fullDetection, request } from './messages';
import { siteAdapter, type SiteAdapter } from './sites';
export type { SiteAdapter } from './sites';
export { getSettings, getMapper, saveMapper } from './storage';
export { approve } from './approvals';
export { logEvents } from './events';
export { openGate } from './gateFrame';
export interface GatePayload {
  mode: 'paste' | 'file' | 'send' | 'cant_check';
  title: string;
  items: Array<{ label: string; value: string; why: string; placeholder: string }>;
  topics: Array<{ label: string; snippet: string; why: string }>;
  fileName?: string;
  reason?: string;
}
export type GateChoice = 'primary' | 'secondary' | 'cancel';
export function getAdapter(): SiteAdapter | null {
  const adapter = siteAdapter();
  return adapter && settingsSnapshot().sites.includes(adapter.id) ? adapter : null;
}
export const convId = () => siteAdapter()?.convId() ?? 'new';
export async function detectWithTimeout(text: string, ms = 1500): Promise<DetectionResult> {
  const settings = await getSettings();
  const fast = detectFast(text, settings);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fullDetection(text, settings).catch(() => fast),
      new Promise<DetectionResult>(resolve => { timer = setTimeout(() => resolve(fast), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}
export async function splitForPrompt(r: DetectionResult): Promise<{ toAsk: Finding[]; allowlisted: Finding[] }> {
  await getMapper(); // Refresh known placeholders. A previous Send as is is not consent for a later send.
  const findings = r.findings.filter(f => !isPlaceholder(f));
  return { toAsk: findings.filter(f => !f.allowlisted), allowlisted: findings.filter(f => f.allowlisted) };
}
export async function extractFile(file: File): Promise<Extracted> {
  // A bound avoids Chrome's message-size limit and huge transient number arrays.
  if (file.size > 16 * 1024 * 1024) return { status: 'unsupported', reason: 'Files over 16 MB cannot be checked locally.' };
  try {
    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    return await request<Extracted>({ type: 'EXTRACT_FILE', name: file.name, mime: file.type, bytes });
  } catch { return { status: 'error', reason: 'Local file reading failed. Try again.' }; }
}
