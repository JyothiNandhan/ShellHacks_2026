export type ToolId = "chatgpt" | "claude" | "gemini" | "copilot" | "perplexity" | "deepseek" | "meta_ai" | "grammarly";
export type Site = "chatgpt" | "claude" | "gemini";
export type EntityType =
  | "PERSON" | "EMAIL" | "PHONE" | "ADDRESS" | "SSN" | "CREDIT_CARD" | "BANK"
  | "API_KEY" | "PASSWORD" | "IP_ADDRESS" | "DATE_OF_BIRTH"
  | "LOCATION" | "ORGANIZATION" | "USER_TERM";
export type TopicType = "HEALTH" | "FINANCE" | "LEGAL";
export type Severity = "high" | "medium" | "low";
export type Source = "user_terms" | "rule" | "ner" | "dictionary";

export interface Finding {
  id: string;
  type: EntityType;
  value: string;
  key: string;
  start: number;
  end: number;
  severity: Severity;
  source: Source;
  confidence: number;
  allowlisted: boolean;
}
export interface TopicFlag { topic: TopicType; start: number; end: number; sentence: string; keywords: string[] }
export interface DetectionResult { findings: Finding[]; topics: TopicFlag[] }
export interface UserTerms { names: string[]; emails: string[]; phones: string[]; addresses: string[]; custom: string[] }
export interface DetectOptions {
  userTerms?: UserTerms;
  allowlist?: string[];
  enabledTypes?: EntityType[];
  enableNameDictionary?: boolean;
}
export interface NerEntity { type: "PERSON" | "LOCATION" | "ORGANIZATION"; start: number; end: number; score: number }
export type NerRunner = (text: string) => Promise<NerEntity[]>;
export type EventSource = "paste" | "file" | "typed";
export type EventAction = "renamed" | "as_is" | "allowlisted";
export interface PiiEvent { type: EntityType; site: Site; source: EventSource; action: EventAction; ts: number }
export interface Settings {
  userTerms: UserTerms;
  allowlist: string[];
  enabledTypes: EntityType[];
  sites: Site[];
}
