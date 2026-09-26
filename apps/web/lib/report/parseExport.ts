import JSZip from "jszip";
import type { ParsedMessage } from "./types";
export const INVALID_EXPORT =
  "No supported chat messages found. Upload a ChatGPT or Claude conversation ZIP/JSON, or Gemini MyActivity.json from Google Takeout.";
const MAX_BYTES = 200 * 1024 * 1024;
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
function parseChatGPT(data: unknown): {
  messages: ParsedMessage[];
  conversationCount: number;
} {
  if (!Array.isArray(data)) throw new Error(INVALID_EXPORT);
  const messages: ParsedMessage[] = [];
  const ids = new Set<string>();
  const seen = new Set<string>();
  for (const raw of data) {
    const conv = object(raw);
    if (!conv) continue;
    const id = conv.conversation_id ?? conv.id;
    const mapping = object(conv.mapping);
    if (typeof id !== "string" || !id || !mapping) continue;
    let valid = false;
    for (const rawNode of Object.values(mapping)) {
      const node = object(rawNode);
      const msg = object(node?.message);
      const content = object(msg?.content);
      const role = object(msg?.author)?.role;
      if (
        !msg ||
        !content ||
        (role !== "user" && role !== "assistant") ||
        (content.content_type !== "text" &&
          content.content_type !== "multimodal_text") ||
        !Array.isArray(content.parts)
      )
        continue;
      const text = content.parts
        .filter((p: unknown) => typeof p === "string")
        .join("\n")
        .trim();
      if (!text) continue;
      const messageId = String(msg.id ?? node?.id ?? "");
      if (!messageId) continue;
      const key = JSON.stringify([id, messageId]);
      valid = true;
      if (seen.has(key)) continue;
      seen.add(key);
      const timestamp = Number(msg.create_time ?? conv.create_time) * 1000;
      messages.push({
        conversationId: id,
        conversationTitle:
          typeof conv.title === "string" ? conv.title : "Untitled chat",
        messageId,
        role,
        createdAt:
          Number.isFinite(timestamp) &&
          timestamp > 0 &&
          timestamp <= 8640000000000000
            ? timestamp
            : 0,
        text,
      });
    }
    if (valid) ids.add(id);
  }
  if (!messages.length) throw new Error(INVALID_EXPORT);
  return { messages, conversationCount: ids.size };
}
export function parseConversations(data: unknown): {
  messages: ParsedMessage[];
  conversationCount: number;
} {
  const root = object(data);
  if (root && Array.isArray(root.data_files))
    throw new Error(
      "This Claude manifest contains download links, not messages. Download its conversations ZIP and select that file to scan.",
    );
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(root?.conversations)
      ? root.conversations
      : root?.chat_messages
        ? [root]
        : [];
  const messages: ParsedMessage[] = [];
  const seen = new Set<string>();
  const add = (m: ParsedMessage) => {
    const key = JSON.stringify([m.conversationId, m.messageId]);
    if (m.text.trim() && !seen.has(key)) {
      seen.add(key);
      messages.push(m);
    }
  };
  for (const raw of rows) {
    const row = object(raw);
    if (!row) continue;
    if (object(row.mapping)) {
      try {
        for (const m of parseChatGPT([row]).messages)
          add({
            ...m,
            provider: "chatgpt",
            conversationUrl: `https://chatgpt.com/c/${encodeURIComponent(m.conversationId)}`,
          });
      } catch {
        /* Ignore non-conversation metadata. */
      }
    } else if (
      Array.isArray(row.chat_messages) &&
      typeof (row.uuid ?? row.id) === "string"
    ) {
      const id = String(row.uuid ?? row.id);
      for (const [index, rawMessage] of row.chat_messages.entries()) {
        const m = object(rawMessage);
        if (!m || !["human", "assistant"].includes(String(m.sender))) continue;
        const text =
          typeof m.text === "string" && m.text.trim()
            ? m.text
            : Array.isArray(m.content)
              ? m.content
                  .map((block) => {
                    const b = object(block);
                    return b?.type === "text" && typeof b.text === "string"
                      ? b.text
                      : "";
                  })
                  .filter(Boolean)
                  .join("\n")
              : "";
        add({
          provider: "claude",
          conversationId: `claude:${id}`,
          conversationUrl: `https://claude.ai/chat/${encodeURIComponent(id)}`,
          conversationTitle: "Claude conversation",
          messageId: String(m.uuid ?? m.id ?? index),
          role: m.sender === "human" ? "user" : "assistant",
          text,
          createdAt: date(m.created_at ?? row.created_at),
        });
      }
    } else if (
      Array.isArray(row.products) &&
      row.products.some(
        (p) => p === "Gemini Apps" || p === "Gemini" || p === "Bard",
      ) &&
      typeof row.title === "string" &&
      typeof row.time === "string"
    ) {
      // Takeout activity records are prompts, not necessarily complete threads.
      // Only recognized prompt events enter detection; visits/settings are excluded.
      if (!/^Prompted\s+/i.test(row.title)) continue;
      const text = row.title.replace(/^Prompted\s+/i, "").trim();
      const url = geminiUrl(row.titleUrl);
      const identity = url || `activity:${row.time}:${fingerprint(text)}`;
      add({
        provider: "gemini",
        conversationId: `gemini:${identity}`,
        conversationUrl: url || "https://myactivity.google.com/product/gemini",
        conversationTitle: "Gemini activity",
        messageId: JSON.stringify([row.time, fingerprint(text)]),
        role: "user",
        text,
        createdAt: date(row.time),
      });
    }
  }
  if (!messages.length) throw new Error(INVALID_EXPORT);
  return {
    messages,
    conversationCount: new Set(messages.map((m) => m.conversationId)).size,
  };
}
function date(value: unknown) {
  const time = typeof value === "string" ? Date.parse(value) : 0;
  return Number.isFinite(time) && time > 0 ? time : 0;
}
function geminiUrl(value: unknown) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" &&
      u.hostname === "gemini.google.com" &&
      /^\/app\/[a-zA-Z0-9_-]+$/.test(u.pathname)
      ? u.origin + u.pathname
      : "";
  } catch {
    return "";
  }
}
export async function parseExport(file: File) {
  if (file.size > MAX_BYTES)
    throw new Error(
      "This export is larger than 200 MB. Select a smaller conversation data file.",
    );
  try {
    if (/\.json$/i.test(file.name))
      return parseConversations(JSON.parse(await file.text()));
    if (!/\.zip$/i.test(file.name)) throw new Error(INVALID_EXPORT);
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files).filter(
      (entry) => !entry.dir && /\.json$/i.test(entry.name),
    );
    const collected: ParsedMessage[] = [];
    let bytes = 0;
    for (const entry of entries) {
      const expanded = (
        entry as unknown as { _data?: { uncompressedSize?: number } }
      )._data?.uncompressedSize;
      if (expanded && bytes + expanded > MAX_BYTES)
        throw new Error("The expanded export exceeds the 200 MB safety limit.");
      const content = await entry.async("uint8array");
      bytes += content.byteLength;
      if (bytes > MAX_BYTES)
        throw new Error("The expanded export exceeds the 200 MB safety limit.");
      try {
        collected.push(
          ...parseConversations(JSON.parse(new TextDecoder().decode(content)))
            .messages,
        );
      } catch {
        /* ZIPs include non-chat metadata too. */
      }
    }
    const unique = [
      ...new Map(
        collected.map((m) => [
          JSON.stringify([m.conversationId, m.messageId]),
          m,
        ]),
      ).values(),
    ];
    if (!unique.length) throw new Error(INVALID_EXPORT);
    return {
      messages: unique,
      conversationCount: new Set(unique.map((m) => m.conversationId)).size,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      /200 MB|manifest contains/.test(error.message)
    )
      throw error;
    throw new Error(INVALID_EXPORT);
  }
}

function fingerprint(text: string) {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++)
    n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return (n >>> 0).toString(16);
}
