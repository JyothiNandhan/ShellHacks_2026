/// <reference lib="webworker" />
import { detectFast, detectFull } from "@promptshield/engine";
import { createNerRunner } from "@promptshield/engine/ner";
import { parseExport } from "../lib/report/parseExport";
import { buildReport, messageKey } from "../lib/report/buildReport";
import type {
  DetectionResult,
  Phase,
  WorkerInput,
  WorkerOutput,
} from "../lib/report/types";
const send = (message: WorkerOutput) => self.postMessage(message);
const progress = (phase: Phase, done = 0, total = 1) =>
  send({ type: "PROGRESS", phase, done, total });
self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  if (event.data.type !== "START") return;
  const { file, userTerms, sample } = event.data;
  try {
    if (process.env.NEXT_PUBLIC_ENGINE_READY !== "true" && !sample)
      throw new Error(
        "Real-export scanning is waiting for the shared detection engine. Try the sample preview.",
      );
    progress("reading");
    const { messages, conversationCount } = await parseExport(file);
    const users = messages.filter((m) => m.role === "user");
    if (!users.length)
      throw new Error("No user messages were found in this export.");
    const results = new Map<string, DetectionResult>();
    for (let i = 0; i < users.length; i++) {
      results.set(
        messageKey(users[i]),
        detectFast(users[i].text, { userTerms }),
      );
      if (i % 50 === 0) progress("scanning", i, users.length);
    }
    progress("scanning", users.length, users.length);
    let aiNameDetection = false;
    progress("ai");
    try {
      const ner = await createNerRunner({
        onProgress: (p) => progress("ai", p.progress ?? 0, 100),
      });
      const candidates = users
        .filter(
          (m) =>
            m.text.length < 3000 && /\b\w+[,;:]?\s+[A-Z][a-z]+/.test(m.text),
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 400);
      let completed = 0;
      for (let i = 0; i < candidates.length; i++) {
        const m = candidates[i];
        results.set(
          messageKey(m),
          await detectFull(m.text, { userTerms }, ner),
        );
        completed++;
        progress("ai", i + 1, candidates.length);
      }
      aiNameDetection =
        completed > 0 && process.env.NEXT_PUBLIC_ENGINE_READY === "true";
    } catch {
      aiNameDetection = false;
    }
    progress("building");
    send({
      type: "DONE",
      report: buildReport(
        messages,
        conversationCount,
        results,
        aiNameDetection,
      ),
    });
  } catch (error) {
    send({
      type: "ERROR",
      message:
        error instanceof Error
          ? error.message
          : "The scan could not finish. Please try again.",
    });
  }
};
