import { maskValue, SEVERITY_WEIGHT } from "@promptshield/engine";
import type {
  Category,
  DetectionResult,
  EntityType,
  ParsedMessage,
  ScanReport,
} from "./types";
export const SCORE_EXPLANATION =
  "A screening indicator, not a security guarantee. Each finding adds 10 (high), 5 (medium), or 2 (low) risk points; each topic adds 3. Score = round(100 − min(100, 12 × log₂(1 + total risk ÷ conversations × 10))).";
export function buildReport(
  messages: ParsedMessage[],
  conversationCount: number,
  results: Map<string, DetectionResult>,
  aiNameDetection: boolean,
): ScanReport {
  const users = messages.filter((m) => m.role === "user");
  const conversationOrder = new Map<string, number>();
  const lastMessageAt = new Map<string, number>();
  for (const message of users) {
    if (!conversationOrder.has(message.conversationId))
      conversationOrder.set(message.conversationId, conversationOrder.size + 1);
    lastMessageAt.set(
      message.conversationId,
      Math.max(
        lastMessageAt.get(message.conversationId) ?? 0,
        message.createdAt,
      ),
    );
  }
  const categories = new Map<Category, Set<string>>();
  const repeated = new Map<
    string,
    { type: EntityType; masked: string; chats: Set<string> }
  >();
  const chats = new Map<string, ScanReport["riskiestConversations"][number]>();
  const months = new Map<string, Set<string>>();
  let totalRisk = 0;
  let findingCount = 0;
  const dates = messages.map((m) => m.createdAt).filter((t) => t > 0);
  const from = dates.reduce((a, b) => Math.min(a, b), Infinity);
  const to = dates.reduce((a, b) => Math.max(a, b), 0);
  for (const msg of users) {
    const month =
      msg.createdAt > 0
        ? new Date(msg.createdAt).toISOString().slice(0, 7)
        : null;
    if (month && !months.has(month)) months.set(month, new Set());
    const result = results.get(messageKey(msg));
    if (!result) continue;
    if (!result.findings.length && !result.topics.length) continue;
    if (month) months.get(month)!.add(msg.conversationId);
    // Titles may contain personal information too. Never return raw export titles to the UI.
    const chat = chats.get(msg.conversationId) ?? {
      conversationId: msg.conversationId,
      title: `Conversation ${conversationOrder.get(msg.conversationId)}`,
      url:
        msg.conversationUrl ??
        `https://chatgpt.com/c/${encodeURIComponent(msg.conversationId)}`,
      riskScore: 0,
      types: [],
      lastMessageAt: 0,
      examples: [],
    };
    chat.lastMessageAt = lastMessageAt.get(msg.conversationId) ?? msg.createdAt;
    const add = (type: Category, masked: string, weight: number) => {
      const set = categories.get(type) ?? new Set();
      set.add(msg.conversationId);
      categories.set(type, set);
      if (!chat.types.includes(type)) chat.types.push(type);
      if (
        chat.examples.length < 6 &&
        !chat.examples.some((e) => e.type === type && e.masked === masked)
      )
        chat.examples.push({ type, masked });
      chat.riskScore += weight;
      totalRisk += weight;
    };
    findingCount += result.findings.length;
    for (const f of result.findings) {
      const masked = maskValue(f.type, f.value);
      add(f.type, masked, SEVERITY_WEIGHT[f.severity]);
      const key = JSON.stringify([f.type, f.key]);
      const item = repeated.get(key) ?? {
        type: f.type,
        masked,
        chats: new Set<string>(),
      };
      item.chats.add(msg.conversationId);
      repeated.set(key, item);
    }
    for (const t of result.topics) add(t.topic, "Sensitive topic", 3);
    chats.set(msg.conversationId, chat);
  }
  // Include months with no detections and fill calendar gaps.
  if (dates.length) {
    const start = new Date(from);
    start.setUTCDate(1);
    const end = new Date(to);
    for (let i = 0; i < 1200 && start <= end; i++) {
      const month = start.toISOString().slice(0, 7);
      if (!months.has(month)) months.set(month, new Set());
      start.setUTCMonth(start.getUTCMonth() + 1);
    }
  }
  return {
    providers: [...new Set(messages.map((m) => m.provider ?? "chatgpt"))],
    activityBased: messages.some((m) => m.provider === "gemini"),
    conversationCount,
    messageCount: users.length,
    dateRange: { from: dates.length ? from : 0, to: to },
    conversationsWithFindings: chats.size,
    findingCount,
    countsByType: Object.fromEntries(
      [...categories].map(([type, set]) => [type, set.size]),
    ),
    topRepeated: [...repeated.values()]
      .sort((a, b) => b.chats.size - a.chats.size)
      .slice(0, 5)
      .map(({ type, masked, chats }) => ({
        type,
        masked,
        conversationCount: chats.size,
      })),
    timeline: [...months]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, ids]) => ({ month, conversationsWithFindings: ids.size })),
    riskiestConversations: [...chats.values()]
      .sort(
        (a, b) =>
          b.riskScore - a.riskScore || b.lastMessageAt - a.lastMessageAt,
      )
      .slice(0, 10),
    privacyScore: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            Math.min(
              100,
              12 *
                Math.log2(
                  1 + (totalRisk / Math.max(1, conversationCount)) * 10,
                ),
            ),
        ),
      ),
    ),
    aiNameDetection,
  };
}
export const messageKey = (m: ParsedMessage) =>
  JSON.stringify([m.conversationId, m.messageId]);
