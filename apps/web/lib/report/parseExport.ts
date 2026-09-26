import JSZip from "jszip";
import type { ParsedMessage } from "./types";
export const INVALID_EXPORT =
  "This doesn't look like a ChatGPT export. Select the zip from OpenAI's email.";
const MAX_BYTES = 200 * 1024 * 1024;
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
export function parseConversations(data: unknown): {
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
export async function parseExport(file: File) {
  if (file.size > MAX_BYTES)
    throw new Error(
      "This export is larger than 200 MB. Select a smaller conversations.json file.",
    );
  try {
    let data: unknown[] = [];
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entries = Object.values(zip.files).filter(
        (entry) =>
          !entry.dir && /(^|\/)conversations(-\d+)?\.json$/.test(entry.name),
      );
      if (!entries.length) throw new Error(INVALID_EXPORT);
      let bytes = 0;
      for (const entry of entries) {
        // Reject oversized expanded entries before JSZip allocates their full contents.
        const expanded = (
          entry as unknown as { _data?: { uncompressedSize?: number } }
        )._data?.uncompressedSize;
        if (expanded && expanded + bytes > MAX_BYTES)
          throw new Error(
            "The expanded export exceeds the 200 MB safety limit.",
          );
        const content = await entry.async("uint8array");
        bytes += content.byteLength;
        if (bytes > MAX_BYTES)
          throw new Error(
            "The expanded export exceeds the 200 MB safety limit.",
          );
        const parsed: unknown = JSON.parse(new TextDecoder().decode(content));
        if (!Array.isArray(parsed)) throw new Error(INVALID_EXPORT);
        data = data.concat(parsed);
      }
    } else if (/\.json$/i.test(file.name)) {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error(INVALID_EXPORT);
      data = parsed;
    } else throw new Error(INVALID_EXPORT);
    return parseConversations(data);
  } catch (error) {
    if (error instanceof Error && /200 MB/.test(error.message)) throw error;
    throw new Error(INVALID_EXPORT);
  }
}
