export type ToolId = "chatgpt" | "claude" | "gemini" | "copilot" | "perplexity" | "deepseek" | "meta_ai" | "grammarly";
export type Site = "chatgpt" | "claude" | "gemini";

export type EntityType =
  | "PERSON" | "EMAIL" | "PHONE" | "ADDRESS" | "SSN" | "CREDIT_CARD" | "BANK"
  | "API_KEY" | "PASSWORD" | "IP_ADDRESS" | "DATE_OF_BIRTH"
  | "LOCATION" | "ORGANIZATION" | "USER_TERM";
export type TopicType = "HEALTH" | "FINANCE" | "LEGAL";
export type Severity = "high" | "medium" | "low";
export type Source = "user_terms" | "rule" | "ner" | "dictionary";   // merge priority in this order

export interface Finding {
  id: string;            // `${type}:${start}:${end}`
  type: EntityType;
  value: string;         // exactly text.slice(start, end)
  key: string;           // normalized value: lowercase+trim; digits only for PHONE/CREDIT_CARD/BANK/SSN
  start: number; end: number;
  severity: Severity;
  source: Source;
  confidence: number;
  allowlisted: boolean;  // true if the value is on the user's "always allow" list
}
export interface TopicFlag { topic: TopicType; start: number; end: number; sentence: string; keywords: string[] }
export interface DetectionResult { findings: Finding[]; topics: TopicFlag[] }   // findings sorted, no overlaps

export interface UserTerms { names: string[]; emails: string[]; phones: string[]; addresses: string[]; custom: string[] }
export interface DetectOptions {
  userTerms?: UserTerms;          // always flag these
  allowlist?: string[];           // never ask about these (returned with allowlisted: true)
  enabledTypes?: EntityType[];    // default: all except ORGANIZATION
  enableNameDictionary?: boolean; // default true
}
export interface NerEntity { type: "PERSON" | "LOCATION" | "ORGANIZATION"; start: number; end: number; score: number }
export type NerRunner = (text: string) => Promise<NerEntity[]>;

// Extension events — never contain values
export type EventSource = "paste" | "file" | "typed";
export type EventAction = "renamed" | "as_is" | "allowlisted";
export interface PiiEvent { type: EntityType; site: Site; source: EventSource; action: EventAction; ts: number }

export interface Settings {
  userTerms: UserTerms;
  allowlist: string[];
  enabledTypes: EntityType[];
  sites: Site[];                  // protection on/off per site
}

