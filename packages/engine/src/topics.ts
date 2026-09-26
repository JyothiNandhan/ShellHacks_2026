import type { TopicFlag, TopicType } from './types';
import { escapeRegex, splitSentences } from './util';
export const KEYWORDS: Record<TopicType, string[]> = {
  HEALTH: 'diagnosed|diagnosis|prescription|medication|therapy|depression|anxiety|pregnant|pregnancy|surgery|cancer|diabetes|hospital|doctor|patient|medical|illness|disease|symptoms|treatment|mental health|blood pressure|heart attack|stroke|asthma|allergy|allergies|infection|antibiotics|insulin|hiv|aids|fertility|miscarriage|abortion|disability|chronic pain|bipolar|ptsd|suicidal|chemotherapy|biopsy|psychiatrist|therapist|addiction|rehab|vaccination|test results|health insurance|medical records'.split('|'),
  FINANCE: 'salary|bank account|loan|debt|credit score|tax return|mortgage|income|wages|paycheck|pension|retirement|savings|investment|investments|dividend|interest rate|credit card|debit card|bankruptcy|foreclosure|overdraft|routing number|account balance|net worth|taxes|tax refund|irs|401k|ira|student loan|car payment|rent payment|financial aid|alimony|child support|inheritance|wire transfer|payment|budget|brokerage|stock portfolio|capital gains|insurance premium|unpaid bills|credit report|payroll|annual bonus|social security benefits|financial hardship'.split('|'),
  LEGAL: 'lawsuit|arrested|court date|lawyer|custody|divorce|immigration status|attorney|subpoena|summons|warrant|probation|parole|criminal|felony|misdemeanor|conviction|indictment|plea|bail|litigation|settlement|legal advice|restraining order|deportation|visa application|asylum|green card|citizenship|police report|witness|testimony|evidence|prosecution|defendant|plaintiff|hearing|tribunal|appeal|eviction|contract dispute|discrimination|harassment|wrongful termination|power of attorney|estate planning|last will|legal guardian|court order|public defender'.split('|'),
};
const patterns = Object.entries(KEYWORDS).map(([topic, words]) => ({ topic: topic as TopicType, regex: new RegExp(`\\b(?:${words.map(escapeRegex).join('|')})\\b`, 'gi') }));
export function findTopics(text: string): TopicFlag[] {
  const result: TopicFlag[] = [];
  for (const sentence of splitSentences(text)) for (const { topic, regex } of patterns) {
    regex.lastIndex = 0; const keywords = [...new Set(Array.from(sentence.sentence.matchAll(regex), m => m[0].toLowerCase()))];
    if (keywords.length) result.push({ topic, ...sentence, keywords });
  }
  return result;
}
