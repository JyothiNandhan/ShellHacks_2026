/// <reference lib="webworker" />
import { env } from "@huggingface/transformers";
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
// Same-origin WASM assets, copied by predev/prebuild. One thread works
// without cross-origin isolation and never sends conversation text remotely.
env.backends.onnx.wasm!.wasmPaths = "/promptshield-wasm/";
env.backends.onnx.wasm!.numThreads = 1;

const send = (message: WorkerOutput) => self.postMessage(message);
const progress = (phase: Phase, done = 0, total = 1) =>
  send({ type: "PROGRESS", phase, done, total });
self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  if (event.data.type !== "START") return;
  const { file, userTerms } = event.data;
  try {
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
      aiNameDetection = completed > 0;
    } catch {
      // Do not log error payloads: a runtime error could contain input text.
      console.warn(
        "Local AI name detection could not finish. Pattern results are retained.",
      );
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
