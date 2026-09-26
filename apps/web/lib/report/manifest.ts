// Manifest URLs stay in this tab; never send them to our server or analytics.
export function claudeDownloads(
  data: unknown,
): Array<{ name: string; url: string }> | null {
  if (
    !data ||
    typeof data !== "object" ||
    !("data_files" in data) ||
    !Array.isArray(data.data_files)
  )
    return null;
  return data.data_files.flatMap((file: unknown) => {
    if (!file || typeof file !== "object") return [];
    const f = file as Record<string, unknown>;
    if (f.category !== "conversations" || typeof f.export_url !== "string")
      return [];
    try {
      const url = new URL(f.export_url);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "claude.ai" ||
        url.username ||
        url.password
      )
        return [];
      return [
        {
          name:
            typeof f.filename === "string"
              ? f.filename
              : "Conversation archive",
          url: url.href,
        },
      ];
    } catch {
      return [];
    }
  });
}
