"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowRight,
  ArrowUpRight,
  Upload,
  LockKeyhole,
  LoaderCircle,
  FileArchive,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type {
  Phase,
  ScanReport,
  UserTerms,
  WorkerOutput,
} from "../lib/report/types";
import { claudeDownloads } from "../lib/report/manifest";
import Story from "./Story";
import Report from "./Report";
import PrivacyQuestions from "./PrivacyQuestions";
const phaseLabels: Record<Phase, string> = {
  reading: "Opening your export",
  scanning: "Looking for personal details",
  ai: "Checking names with local AI",
  building: "Putting your story together",
};
export default function ScanFlow({ onScanStart, onReport, onClear }: { onScanStart?: (sample: boolean) => void; onReport?: (report: ScanReport) => void; onClear?: () => void }) {
  const [state, setState] = useState<"start" | "scanning" | "story" | "report">(
    "start",
  );
  const [report, setReport] = useState<ScanReport | null>(null);
  const [progress, setProgress] = useState({
    phase: "reading" as Phase,
    done: 0,
    total: 1,
  });
  const [downloads, setDownloads] = useState<Array<{
    name: string;
    url: string;
  }> | null>(null);
  const [pastedExport, setPastedExport] = useState("");
  const [error, setError] = useState("");
  const [sample, setSample] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [details, setDetails] = useState({
    names: "",
    emails: "",
    phones: "",
    addresses: "",
    custom: "",
  });
  const worker = useRef<Worker | null>(null);
  const sampleFetch = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      worker.current?.terminate();
      sampleFetch.current?.abort();
    },
    [],
  );
  const reset = () => {
    onClear?.();
    worker.current?.terminate();
    worker.current = null;
    sampleFetch.current?.abort();
    setDownloads(null);
    setPastedExport("");
    setReport(null);
    setSample(false);
    setState("start");
    setDetails({
      names: "",
      emails: "",
      phones: "",
      addresses: "",
      custom: "",
    });
    setError("");
    setLoadingSample(false);
  };
  const start = useCallback(
    (file: File, isSample = false) => {
      onScanStart?.(isSample);
      setError("");
      setReport(null);
      setSample(isSample);
      setState("scanning");
      setProgress({ phase: "reading", done: 0, total: 1 });
      worker.current?.terminate();
      const instance = new Worker(
        new URL("../workers/scan.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = instance;
      instance.onmessage = (event: MessageEvent<WorkerOutput>) => {
        const message = event.data;
        if (worker.current !== instance) return;
        if (message.type === "PROGRESS") setProgress(message);
        if (message.type === "DONE") {
          setReport(message.report);
          onReport?.(message.report);
          setState("report");
          window.scrollTo({ top: 0, behavior: "instant" });
          instance.terminate();
          worker.current = null;
        }
        if (message.type === "ERROR") {
          setError(message.message);
          setState("start");
          instance.terminate();
          worker.current = null;
        }
      };
      instance.onerror = () => {
        setError(
          "The local scanner could not start. Please reload and try again.",
        );
        setState("start");
        instance.terminate();
        worker.current = null;
      };
      const userTerms = Object.fromEntries(
        Object.entries(details).map(([key, value]) => [
          key,
          value
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
        ]),
      ) as unknown as UserTerms;
      instance.postMessage({
        type: "START",
        file,
        userTerms,
        sample: isSample,
      });
    },
    [details, onScanStart, onReport],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      const file = files[0];
      if (!file) return;
      setDownloads(null);
      setError("");
      if (/\.json$/i.test(file.name) && file.size < 5 * 1024 * 1024) {
        try {
          const links = claudeDownloads(JSON.parse(await file.text()));
          if (links !== null) {
            setDownloads(links);
            return;
          }
        } catch {
          /* The worker handles malformed conversation files. */
        }
      }
      start(file);
    },
    onDropRejected: () =>
      setError("Choose one .zip or .json export, up to 200 MB."),
    accept: { "application/zip": [".zip"], "application/json": [".json"] },
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
    disabled: loadingSample,
  });
  const trySample = async () => {
    setLoadingSample(true);
    setError("");
    const controller = new AbortController();
    sampleFetch.current = controller;
    try {
      const response = await fetch("/sample/fake-export.zip", {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      start(
        new File([blob], "fake-export.zip", { type: "application/zip" }),
        true,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError("The sample could not load. Please try again.");
    } finally {
      setLoadingSample(false);
    }
  };
  const finish = useCallback(() => setState("report"), []);
  if (state === "story" && report)
    return (
      <div className="scan-shell">
        <Story report={report} onFinish={finish} />
      </div>
    );
  if (state === "report" && report)
    return (
      <Report
        report={report}
        sample={sample}
        onReset={reset}
        onReplay={() => setState("story")}
      />
    );
  if (state === "scanning")
    return (
      <div className="scan-shell">
        <section className="scan-progress" aria-live="polite">
          <div className="scanning-emblem">
            <ShieldCheck size={54} />
          </div>
          <span className="eyebrow">
            {sample
              ? "SCANNING FICTIONAL DEMO DATA"
              : "SCANNING YOUR UPLOADED EXPORT"}
          </span>
          <h1>
            {phaseLabels[progress.phase]}
            <span className="loading-dots">…</span>
          </h1>
          <p>
            Your conversations stay in your browser. This may take a minute,
            <br />
            especially the first time the local AI model downloads.
          </p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={phaseLabels[progress.phase]}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              (progress.done / Math.max(1, progress.total)) * 100,
            )}
          >
            <div
              style={{
                width: `${Math.max(3, (progress.done / Math.max(1, progress.total)) * 100)}%`,
              }}
            />
          </div>
          <span className="fine-print">
            {progress.done} / {progress.total} · {phaseLabels[progress.phase]}
          </span>
          <button className="text-link" onClick={reset}>
            Cancel scan
          </button>
        </section>
      </div>
    );
  return (
    <div className="scan-shell">
      <div className="scan-grid">
        <section className="upload-panel">
          <div
            {...getRootProps({
              className: `dropzone ${isDragActive ? "drag-active" : ""}`,
            })}
          >
            <input
              {...getInputProps({ "aria-label": "Choose your AI chat export" })}
            />
            <span className="upload-icon">
              <Upload size={28} strokeWidth={1.4} />
            </span>
            <h2>
              {isDragActive
                ? "Drop it right here."
                : "Drop your AI chat export"}
            </h2>
            <p>ChatGPT or Claude ZIP/JSON · Gemini Takeout JSON</p>
            <span className="button primary">
              Choose a file <ArrowUpRight size={16} />
            </span>
            <span className="fine-print">ZIP or JSON · up to 200 MB</span>
          </div>
          <div className="local-promise">
            <LockKeyhole size={15} /> Your file never leaves your browser.
          </div>
          <details className="demo-disclosure paste-export">
            <summary>Paste exported JSON instead</summary>
            <p>Paste the JSON containing your conversations from ChatGPT, Claude or Gemini. A download manifest alone does not contain messages.</p>
            <textarea aria-label="Exported conversation JSON" rows={6} value={pastedExport} onChange={(event) => setPastedExport(event.target.value)} spellCheck={false} autoComplete="off" placeholder="Paste your exported JSON here…" />
            <button className="button primary" disabled={loadingSample || !pastedExport.trim()} onClick={() => {
              setDownloads(null);
              try {
                const parsed = JSON.parse(pastedExport);
                const links = claudeDownloads(parsed);
                if (links !== null) { setDownloads(links); return; }
              } catch { setError("That is not valid JSON. Paste the contents of your conversation export, or upload the original ZIP."); return; }
              const file = new File([pastedExport], "conversations.json", { type: "application/json" });
              if (file.size > 200 * 1024 * 1024) { setError("Choose an export up to 200 MB."); return; }
              start(file);
              setPastedExport("");
            }}>Scan pasted export <ArrowRight size={16} /></button>
          </details>
          <details className="demo-disclosure">
            <summary>Explore a fictional demo instead</summary>
            <div className="sample-divider">
              <span>JUST LOOKING AROUND?</span>
            </div>
            <button
              className="sample-button"
              disabled={loadingSample}
              onClick={trySample}
            >
              <span className="sample-icon">
                {loadingSample ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <FileArchive size={20} />
                )}
              </span>
              <span>
                <strong>
                  {loadingSample
                    ? "Loading the sample…"
                    : "Try with sample data"}
                </strong>
                <small>Fictional data only — not your ChatGPT history.</small>
              </span>
              <ArrowRight size={18} />
            </button>
          </details>
          {downloads !== null && (
            <section className="source-banner manifest-help" role="status">
              <div>
                <strong>
                  Claude manifest recognized — download your messages next
                </strong>
                <p>
                  This file lists downloads but contains no chat messages. Open
                  each conversation archive below while signed into Claude, then
                  choose the downloaded ZIP above. Download links may expire. No
                  conversation data has been scanned yet.
                </p>
                {downloads.map((item, index) => (
                  <a
                    key={index}
                    className="button secondary"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    Download {item.name} ↗
                  </a>
                ))}
                {!downloads.length && (
                  <p>
                    No supported Claude download links found. Download the
                    conversation archive directly from Claude’s export email.
                  </p>
                )}
              </div>
            </section>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>
        <aside className="export-guide">
          <span className="eyebrow">FIRST THINGS FIRST</span>
          <h2>Get your AI chat export.</h2>
          <p>
            Export your messages, then select the downloaded file here. We do
            not connect to your accounts.
          </p>
          <div className="provider-guides">
            <details open>
              <summary>ChatGPT</summary>
              <p>
                Settings → Data Controls → Export data. Upload the downloaded
                ZIP or conversations.json.
              </p>
              <a
                className="text-link"
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open ChatGPT ↗
              </a>
            </details>
            <details>
              <summary>Claude</summary>
              <p>
                Settings → Privacy → Export data. Upload the conversation ZIP or
                conversations.json. If you receive a manifest, select it here to
                find the conversation archive download.
              </p>
              <a
                className="text-link"
                href="https://claude.ai/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Claude ↗
              </a>
            </details>
            <details>
              <summary>Gemini</summary>
              <p>
                In Google Takeout, select My Activity → Gemini Apps and choose
                JSON. Upload MyActivity.json or its ZIP. English “Prompted”
                activity records are supported; HTML and other languages are not
                yet supported. Activity entries may not represent complete
                conversations.
              </p>
              <a
                className="text-link"
                href="https://takeout.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Google Takeout ↗
              </a>
            </details>
          </div>
        </aside>
      </div>
      <details className="details-panel">
        <summary>
          <Plus size={17} /> Your details{" "}
          <span>Optional · stay on this device</span>
        </summary>
        <p>
          Add one value per line to help the detector recognize your
          information. Details are kept in this tab only.
        </p>
        <div className="details-grid">
          {Object.keys(details).map((key) => (
            <label key={key}>
              {key === "custom"
                ? "Other private terms"
                : key.charAt(0).toUpperCase() + key.slice(1)}
              <textarea
                rows={2}
                autoComplete="off"
                spellCheck={false}
                value={details[key as keyof typeof details]}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, [key]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </details>
      <PrivacyQuestions categories={[]} defaultTool="chatgpt" />
      <p className="scan-footnote">
        <LockKeyhole size={13} /> No accounts. No analytics. Export processing
        stays on your device.
        <br />
        Sample mode downloads a fixture; local AI may download model files.
        Policy cards send only the detected provider names.
      </p>
    </div>
  );
}
