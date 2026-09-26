export type Extracted =
  | { status: "ok"; text: string }
  | { status: "unsupported" | "empty" | "error"; reason: string };

/** Initial integration stub: .txt only. PDF, DOCX, and other text formats are pending. */
export async function extractText(file: File): Promise<Extracted> {
  if (!file.name.toLowerCase().endsWith(".txt")) {
    return { status: "unsupported", reason: "This starter supports .txt files only." };
  }
  try {
    const text = await file.text();
    if (!text.trim()) return { status: "empty", reason: "The file contains no readable text." };
    return { status: "ok", text };
  } catch {
    // Do not expose file contents or platform error details in UI/log messages.
    return { status: "error", reason: "The file could not be read." };
  }
}
