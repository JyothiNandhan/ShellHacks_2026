"use client";
import type { Phase, ScanReport, WorkerOutput } from "./types";

/** Runs the local scan worker on one export file. Nothing leaves the browser. */
export function runScan(
  file: File,
  onProgress: (p: { phase: Phase; done: number; total: number }) => void,
  sample = false,
  onlyProvider?: "claude",
): { result: Promise<ScanReport>; cancel: () => void } {
  const worker = new Worker(new URL("../../workers/scan.worker.ts", import.meta.url), { type: "module" });
  let reject: (e: Error) => void = () => {};
  const result = new Promise<ScanReport>((resolve, fail) => {
    reject = fail;
    worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
      const message = event.data;
      if (message.type === "PROGRESS") onProgress(message);
      if (message.type === "DONE") {
        worker.terminate();
        resolve(message.report);
      }
      if (message.type === "ERROR") {
        worker.terminate();
        fail(new Error(message.message));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      fail(new Error("The local scanner could not start. Please reload and try again."));
    };
  });
  worker.postMessage({ type: "START", file, sample, onlyProvider });
  return {
    result,
    cancel: () => {
      worker.terminate();
      reject(new Error("cancelled"));
    },
  };
}
