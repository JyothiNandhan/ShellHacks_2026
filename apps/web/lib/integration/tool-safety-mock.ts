// Local UI fixture only. Person 3 owns the API route and real policy answers.
export const TOOL_SAFETY_MOCK = {
  toolId: "chatgpt",
  toolName: "ChatGPT",
  generatedAt: "2026-09-26T00:00:00Z",
  source: "fallback" as const,
  answers: [
    {
      questionId: "training" as const,
      question: "Are my chats used for training?",
      answer:
        "SAMPLE — This is where the cited training-policy answer will appear. No policy claim has been verified in this preview.",
      citations: [],
    },
    {
      questionId: "retention" as const,
      question: "How long is my data kept?",
      answer:
        "SAMPLE — The connected service will explain retention and any exceptions, with links to official sources.",
      citations: [],
    },
    {
      questionId: "opt_out" as const,
      question: "How can I opt out?",
      answer:
        "SAMPLE — Current opt-out instructions will appear here after the tool-safety API is connected.",
      citations: [],
    },
    {
      questionId: "delete" as const,
      question: "What happens when I delete a chat?",
      answer:
        "SAMPLE — The connected service will explain deletion and its limits. Deleting a chat cannot undo information already used.",
      citations: [],
    },
  ],
};
