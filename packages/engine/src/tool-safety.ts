import type { ToolId } from "./types.js";

export type QuestionId = "training" | "retention" | "opt_out" | "delete";
export interface ToolSafety {
  toolId: ToolId;
  toolName: string;
  answers: Array<{
    questionId: QuestionId;
    question: string;
    answer: string;
    citations: Array<{ url: string; title?: string }>;
  }>;
  generatedAt: string;
  source: "snowflake" | "cache" | "fallback";
}
