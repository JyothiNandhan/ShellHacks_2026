import type { EntityType, Settings, Severity, TopicType } from "./types.js";

export const DEFAULT_SETTINGS: Settings = {
  userTerms: { names: [], emails: [], phones: [], addresses: [], custom: [] },
  allowlist: [],
  enabledTypes: ["PERSON", "EMAIL", "PHONE", "ADDRESS", "SSN", "CREDIT_CARD", "BANK", "API_KEY", "PASSWORD", "IP_ADDRESS", "DATE_OF_BIRTH", "LOCATION", "USER_TERM"],
  sites: ["chatgpt", "claude", "gemini"],
};

export const SEVERITY_WEIGHT: Record<Severity, number> = { high: 10, medium: 5, low: 2 };

export const EXPLANATIONS: Record<EntityType | TopicType, { label: string; why: string }> = {
  PERSON: { label: "Name", why: "A name can connect this conversation to a person." },
  EMAIL: { label: "Email", why: "An email address identifies a contact or account." },
  PHONE: { label: "Phone number", why: "A phone number can identify and contact someone." },
  ADDRESS: { label: "Address", why: "An address can reveal where someone lives or works." },
  SSN: { label: "Social Security number", why: "This identifier can be used for identity theft." },
  CREDIT_CARD: { label: "Payment card", why: "Card details can expose a payment account." },
  BANK: { label: "Bank details", why: "Bank details can expose financial account information." },
  API_KEY: { label: "API key", why: "An API key may grant access to a service or its data." },
  PASSWORD: { label: "Password", why: "A password may grant access to an account." },
  IP_ADDRESS: { label: "IP address", why: "An IP address can reveal network information." },
  DATE_OF_BIRTH: { label: "Date of birth", why: "A birth date can help identify someone." },
  LOCATION: { label: "Location", why: "A location can reveal someone's whereabouts." },
  ORGANIZATION: { label: "Organization", why: "An organization name can reveal an affiliation." },
  USER_TERM: { label: "Saved private term", why: "You marked this term as private." },
  HEALTH: { label: "Health", why: "This sentence may contain sensitive health context." },
  FINANCE: { label: "Finance", why: "This sentence may contain sensitive financial context." },
  LEGAL: { label: "Legal", why: "This sentence may contain sensitive legal context." },
};
