import type { EntityType, TopicType, UserTerms } from "@promptshield/engine";
export type {
  EntityType,
  TopicType,
  UserTerms,
  Severity,
  Finding,
  TopicFlag,
  DetectionResult,
} from "@promptshield/engine";
export type Category = EntityType | TopicType;
export interface ParsedMessage {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  role: "user" | "assistant";
  createdAt: number;
  text: string;
}
export interface ScanReport {
  conversationCount: number;
  messageCount: number;
  dateRange: { from: number; to: number };
  conversationsWithFindings: number;
  countsByType: Partial<Record<Category, number>>;
  topRepeated: Array<{
    type: EntityType;
    masked: string;
    conversationCount: number;
  }>;
  timeline: Array<{ month: string; conversationsWithFindings: number }>;
  riskiestConversations: Array<{
    conversationId: string;
    title: string;
    url: string;
    riskScore: number;
    types: Category[];
    lastMessageAt: number;
    examples: Array<{ type: Category; masked: string }>;
  }>;
  privacyScore: number;
  aiNameDetection: boolean;
}
export type Phase = "reading" | "scanning" | "ai" | "building";
export type WorkerOutput =
  | { type: "PROGRESS"; phase: Phase; done: number; total: number }
  | { type: "DONE"; report: ScanReport }
  | { type: "ERROR"; message: string };
export interface WorkerInput {
  type: "START";
  file: File;
  userTerms?: UserTerms;
  sample?: boolean;
}
