// TEMPORARY STUB — Person 1 will replace this whole package
export type Extracted =
  | { status: "ok"; text: string }
  | { status: "unsupported" | "empty" | "error"; reason: string };
export async function extractText(file: File): Promise<Extracted> {
  if (!/\.txt$/i.test(file.name))
    return {
      status: "unsupported",
      reason: "The temporary stub reads .txt files only.",
    };
  try {
    const text = await file.text();
    return text.trim()
      ? { status: "ok", text }
      : { status: "empty", reason: "This file is empty." };
  } catch {
    return { status: "error", reason: "This file could not be read." };
  }
}
