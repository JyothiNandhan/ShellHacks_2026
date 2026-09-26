import type { Settings } from './types';
import { SEVERITIES } from './util';
export const DEFAULT_SETTINGS: Settings = {
  userTerms: { names: [], emails: [], phones: [], addresses: [], custom: [] }, allowlist: [],
  enabledTypes: (Object.keys(SEVERITIES) as Array<keyof typeof SEVERITIES>).filter(t => t !== 'ORGANIZATION'),
  sites: ['chatgpt', 'claude', 'gemini'],
};
