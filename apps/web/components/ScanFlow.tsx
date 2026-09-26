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
import Story from "./Story";
import Report from "./Report";
const phaseLabels: Record<Phase, string> = {
  reading: "Opening your export",
  scanning: "Looking for personal details",
  ai: "Checking names with local AI",
  building: "Putting your story together",
};
export default function ScanFlow() {
  const [state, setState] = useState<"start" | "scanning" | "story" | "report">(
    "start",
  );
  const [report, setReport] = useState<ScanReport | null>(null);
  const [progress, setProgress] = useState({
    phase: "reading" as Phase,
    done: 0,
    total: 1,
  });
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
    worker.current?.terminate();
    worker.current = null;
    sampleFetch.current?.abort();
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
          setState("story");
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
    [details],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && start(files[0]),
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
      <div className="scan-heading">
        <span className="eyebrow">
          <span className="live-dot" /> LOOK BACK. TAKE CONTROL.
        </span>
        <h1>
          Your AI history.
          <br />
          <span>A little more clarity.</span>
        </h1>
        <p>
          A private look at what you’ve shared with ChatGPT.
          <br />
          Upload your own export to calculate your results. This website cannot
          read your signed-in ChatGPT account directly.
        </p>
      </div>
      <section
        className="empty-audit"
        aria-label="Your scan results before scanning"
      >
        <div className="empty-audit-heading">
          <span className="eyebrow">NO EXPORT SCANNED YET</span>
          <span>Your results start here.</span>
        </div>
        <div className="summary-grid">
          {[
            "Conversations",
            "Chats with findings",
            "Categories detected",
            "Privacy score",
          ].map((label) => (
            <div key={label}>
              <div className="metric-label">{label}</div>
              <strong>0</strong>
              <small>
                {label === "Privacy score"
                  ? "Not calculated yet"
                  : "Awaiting your export"}
              </small>
            </div>
          ))}
        </div>
        <p>
          These are empty counters, not an assessment. Your results appear only
          after your file is scanned. Counts describe findings in the export,
          not guaranteed detection of every sensitive detail.
        </p>
      </section>
      <div className="scan-grid">
        <section className="upload-panel">
          <div
            {...getRootProps({
              className: `dropzone ${isDragActive ? "drag-active" : ""}`,
            })}
          >
            <input
              {...getInputProps({ "aria-label": "Choose your ChatGPT export" })}
            />
            <span className="upload-icon">
              <Upload size={28} strokeWidth={1.4} />
            </span>
            <h2>
              {isDragActive
                ? "Drop it right here."
                : "Drop your ChatGPT export"}
            </h2>
            <p>Drag your .zip or conversations.json file here</p>
            <span className="button primary">
              Choose a file <ArrowUpRight size={16} />
            </span>
            <span className="fine-print">ZIP or JSON · up to 200 MB</span>
          </div>
          <div className="local-promise">
            <LockKeyhole size={15} /> Your file never leaves your browser.
          </div>
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
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>
        <aside className="export-guide">
          <span className="eyebrow">FIRST THINGS FIRST</span>
          <h2>Get your ChatGPT export.</h2>
          <p>It takes a few clicks. Your download will arrive by email.</p>
          <ol>
            {[
              ["Open ChatGPT settings", "Click your profile, then Settings."],
              [
                "Head to Data Controls",
                "Find the controls for your conversation data.",
              ],
              ["Request an export", "Choose Export data and confirm."],
              [
                "Check your inbox",
                "Download the zip from OpenAI’s email, then drop it here.",
              ],
            ].map(([title, body], i) => (
              <li key={title}>
                <span>{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            className="text-link"
            href="https://chatgpt.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open ChatGPT <ArrowUpRight size={15} />
          </a>
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
      <p className="scan-footnote">
        <LockKeyhole size={13} /> No accounts. No analytics. Export processing
        stays on your device.
        <br />
        Sample mode downloads a fixture; local AI may download model files.
        Policy cards send only “chatgpt”.
      </p>
    </div>
  );
}
