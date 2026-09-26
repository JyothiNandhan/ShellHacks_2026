import { DEFAULT_SETTINGS, PlaceholderMapper, type Finding, type Settings } from '@promptshield/engine';
import { siteAdapter } from './sites';
import { request } from './messages';
let settings: Settings = structuredClone(DEFAULT_SETTINGS);
let ready = false;
const mapperContexts = new WeakMap<PlaceholderMapper, string>();
export const settingsSnapshot = () => settings;
export const settingsReady = () => ready;
export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get<{ settings?: Settings }>('settings')).settings;
  settings = { ...structuredClone(DEFAULT_SETTINGS), ...stored, userTerms: { ...DEFAULT_SETTINGS.userTerms, ...stored?.userTerms } };
  ready = true;
  return settings;
}
export function watchSettings(onChange: () => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes.settings) { ready = false; void getSettings().then(onChange).catch(() => {}); }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
export function contextKey(): string {
  const adapter = siteAdapter();
  if (!adapter) throw new Error('Unsupported site');
  return `${adapter.id}:${adapter.convId()}`;
}
// Placeholders already inserted (e.g. person_1@example.com) look like real values; never flag them again.
const placeholders = new Map<string, Set<string>>();
const rememberPlaceholders = (key: string, map: Record<string, string>) => {
  const values = placeholders.get(key) ?? new Set<string>();
  Object.values(map).forEach(v => values.add(v.toLowerCase()));
  placeholders.set(key, values);
};
export function isPlaceholder(f: Finding): boolean {
  const values = siteAdapter() && placeholders.get(`map:${contextKey()}`);
  return !!values && (values.has(f.value.toLowerCase()) || values.has(f.key));
}
export async function getMapper(): Promise<PlaceholderMapper> {
  const key = `map:${contextKey()}`;
  const initial = await request<Record<string, string>>({ type: 'SESSION_GET', key });
  const mapper = new PlaceholderMapper(initial ?? {});
  mapperContexts.set(mapper, key);
  rememberPlaceholders(key, initial ?? {});
  return mapper;
}
export async function saveMapper(mapper: PlaceholderMapper): Promise<void> {
  const key = mapperContexts.get(mapper) ?? `map:${contextKey()}`;
  if (key !== `map:${contextKey()}`) throw new Error('Conversation changed');
  await request({ type: 'MAP_SAVE', key, value: mapper.toJSON() });
  rememberPlaceholders(key, mapper.toJSON());
}
