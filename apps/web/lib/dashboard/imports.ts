"use client";
import { useCallback, useEffect, useState } from "react";
import type { ScanReport } from "../report/types";

/** What the dashboard keeps from an imported export: totals and category names only. */
export type ImportedExport = {
  id: string;
  providers: string[];
  sample: boolean;
  importedAt: number;
  conversations: number;
  messages: number;
  findings: number;
  categories: string[];
  from: number;
  to: number;
  score: number;
};

const KEY = "mindyourprompt-dashboard-imports";
const EVENT = "mindyourprompt-imports-change";

export function summarize(report: ScanReport, sample: boolean): ImportedExport {
  const providers = [...(report.providers ?? ["chatgpt"])].sort();
  return {
    // Re-importing the same provider's export replaces it instead of double counting.
    id: sample ? "sample" : providers.join("+"),
    providers,
    sample,
    importedAt: Date.now(),
    conversations: report.conversationCount,
    messages: report.messageCount,
    findings: report.findingCount,
    categories: Object.keys(report.countsByType).sort(),
    from: report.dateRange.from,
    to: report.dateRange.to,
    score: report.privacyScore,
  };
}

function read(): ImportedExport[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Only Claude exports are imported; drop anything saved by earlier builds.
    return Array.isArray(value) ? value.filter((v) => v && typeof v.id === "string" && Number.isFinite(v.score) && Array.isArray(v.providers) && v.providers.join() === "claude") : [];
  } catch {
    return [];
  }
}

function write(value: ImportedExport[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Storage can be blocked; the in-memory state below still updates. */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Imports stay in this browser's storage. Only totals are stored, never messages or values. */
export function useImports() {
  const [imports, setImports] = useState<ImportedExport[]>([]);
  useEffect(() => {
    const refresh = () => setImports(read());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const add = useCallback((item: ImportedExport) => {
    const next = [...read().filter((i) => i.id !== item.id), item];
    setImports(next);
    write(next);
  }, []);
  const clear = useCallback(() => {
    setImports([]);
    write([]);
  }, []);
  return { imports, addImport: add, clearImports: clear };
}
