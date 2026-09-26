"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  ArrowUpRight,
  FileArchive,
  Layers,
  LoaderCircle,
  MessageSquareWarning,
  MessagesSquare,
  Puzzle,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  detectFast,
  EXPLANATIONS,
  PlaceholderMapper,
  redactText,
  type Finding,
} from "@promptshield/engine";
import { useLiveStats, type LiveStats } from "../lib/dashboard/liveStats";
import { summarize, useImports, type ImportedExport } from "../lib/dashboard/imports";
import { runScan } from "../lib/report/runScan";
import { claudeDownloads } from "../lib/report/manifest";
import type { Phase } from "../lib/report/types";

const toolNames: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  copilot: "Copilot",
  perplexity: "Perplexity",
  deepseek: "DeepSeek",
  meta_ai: "Meta AI",
  grammarly: "Grammarly",
};
const phaseLabels: Record<Phase, string> = {
  reading: "Opening your export",
  scanning: "Looking for personal details",
  ai: "Checking names with local AI",
  building: "Adding it to your dashboard",
};
const label = (c: string) => EXPLANATIONS[c as keyof typeof EXPLANATIONS]?.label ?? c;
const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
const month = (ts: number) =>
  ts ? new Date(ts).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";

export default function Dashboard() {
  const { live, resetLive } = useLiveStats();
  const { imports, addImport, clearImports } = useImports();
  const stats = live.status === "connected" ? live.stats : null;

  const totals = useMemo(() => {
    const categories = new Set<string>(stats?.categories ?? []);
    for (const i of imports) i.categories.forEach((c) => categories.add(c));
    // Each source starts at 100; combining them multiplies the remaining share, so any leak lowers the total.
    const score = Math.round(
      imports.reduce((s, i) => (s * i.score) / 100, stats?.score ?? 100),
    );
    return {
      conversations: (stats?.conversations ?? 0) + imports.reduce((s, i) => s + i.conversations, 0),
      shared: (stats?.shared ?? 0) + imports.reduce((s, i) => s + i.findings, 0),
      categories: [...categories].sort(),
      score,
    };
  }, [stats, imports]);

  const reset = () => {
    if (!window.confirm("Reset every counter to zero and your score to 100? Imported exports and live extension totals on this device will be cleared.")) return;
    clearImports();
    if (stats) resetLive();
  };

  const tone = totals.score < 40 ? "low" : totals.score <= 70 ? "mid" : "high";

  return (
    <div className="dashboard">
      <header className="dashboard-heading">
        <span className="eyebrow">
          <span className="live-dot" /> YOUR AI PRIVACY DASHBOARD
        </span>
        <h1>Mind your Prompt!</h1>
        <p>Everything you’ve shared with AI chatbots, in four numbers. Counts and categories only — never what you typed.</p>
      </header>

      <div className="summary-grid dashboard-grid" aria-live="polite">
        <div>
          <div className="metric-label">
            <span>Conversations with AI</span>
            <MessagesSquare size={19} />
          </div>
          <strong>{totals.conversations.toLocaleString()}</strong>
          <small>ChatGPT, Claude and Gemini</small>
        </div>
        <div>
          <div className="metric-label">
            <span>Times personal info was shared</span>
            <MessageSquareWarning size={19} />
          </div>
          <strong>{totals.shared.toLocaleString()}</strong>
          <small>Details that reached the AI unchanged</small>
        </div>
        <div>
          <div className="metric-label">
            <span>Categories shared</span>
            <Layers size={19} />
          </div>
          <strong>{totals.categories.length}</strong>
          <small title={totals.categories.map(label).join(", ")}>
            {totals.categories.length ? list(totals.categories.slice(0, 3).map(label)) + (totals.categories.length > 3 ? "…" : "") : "Nothing shared yet"}
          </small>
        </div>
        <div className={`score-tile score-${tone}`}>
          <div className="metric-label">
            <span>Privacy score</span>
            <ShieldCheck size={19} />
          </div>
          <strong>
            {totals.score}
            <i>/100</i>
          </strong>
          <small>Starts at 100 · drops with every detail sent as is</small>
        </div>
      </div>

      <div className="dashboard-reset">
        <button className="button secondary" onClick={reset}>
          <RotateCcw size={15} /> Reset to zero
        </button>
        <span className="fine-print" role="status">
          {live.status === "connected"
            ? "Extension connected · updates live when you send a prompt."
            : live.status === "error"
              ? "Extension connection failed. Reload the extension and this page."
              : live.status === "missing"
                ? "Extension not detected · import an export below, or install the extension to track new chats live."
                : "Looking for the extension…"}
        </span>
      </div>

      <Summary imports={imports} stats={stats} />
      <ImportExport onImported={addImport} />
      <AskBox categories={totals.categories} defaultTool="claude" />

      {live.status === "missing" && (
        <section className="dashboard-card extension-nudge">
          <Puzzle size={22} />
          <div>
            <h2>Track new chats as they happen</h2>
            <p>The PromptShield Chrome extension catches personal details before they reach ChatGPT, Claude or Gemini, and keeps this dashboard up to date.</p>
          </div>
          <Link className="button primary" href="/#extension">
            Get the extension <ArrowUpRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}

function Summary({ imports, stats }: { imports: ImportedExport[]; stats: LiveStats | null }) {
  if (!imports.length && !stats?.prompts) return null;
  return (
    <section className="dashboard-card" aria-label="Summary">
      <h2>Your summary</h2>
      {imports.map((i) => {
        const tools = list(i.providers.map((p) => toolNames[p] ?? p));
        return (
          <p key={i.id}>
            {i.sample ? "From the fictional Claude sample" : `From your ${tools} export`}
            {i.from ? ` (${month(i.from)} – ${month(i.to)})` : ""}: you had <b>{i.conversations.toLocaleString()}</b> conversation{i.conversations === 1 ? "" : "s"} with {tools} and shared personal information <b>{i.findings.toLocaleString()}</b> time{i.findings === 1 ? "" : "s"}
            {i.categories.length ? <> across {i.categories.length} categor{i.categories.length === 1 ? "y" : "ies"}: {list(i.categories.map(label))}.</> : "."}
          </p>
        );
      })}
      {!!stats?.prompts && (
        <p>
          Since installing the extension: <b>{stats.conversations}</b> conversation{stats.conversations === 1 ? "" : "s"} and <b>{stats.prompts}</b> checked prompt{stats.prompts === 1 ? "" : "s"}. You sent <b>{stats.shared}</b> personal detail{stats.shared === 1 ? "" : "s"} as is and replaced <b>{stats.protected}</b> with placeholders.
        </p>
      )}
    </section>
  );
}

function ImportExport({ onImported }: { onImported: (i: ImportedExport) => void }) {
  const [progress, setProgress] = useState<{ phase: Phase; done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  const start = async (file: File, sample = false) => {
    setMessage(null);
    setProgress({ phase: "reading", done: 0, total: 1 });
    const scan = runScan(file, setProgress, sample, "claude");
    cancel.current = scan.cancel;
    try {
      const report = await scan.result;
      onImported(summarize(report, sample));
      setMessage({ error: false, text: `Added ${report.conversationCount.toLocaleString()} Claude conversations from ${file.name}.` });
    } catch (e) {
      if ((e as Error).message !== "cancelled") setMessage({ error: true, text: (e as Error).message });
    } finally {
      cancel.current = null;
      setProgress(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      const file = files[0];
      if (!file) return;
      if (/\.json$/i.test(file.name) && file.size < 5 * 1024 * 1024) {
        try {
          if (claudeDownloads(JSON.parse(await file.text())) !== null) {
            setMessage({ error: true, text: "This file lists your Claude export downloads, not the conversations. Unzip the export and import conversations.json instead." });
            return;
          }
        } catch {
          /* The worker reports malformed files. */
        }
      }
      void start(file);
    },
    onDropRejected: () => setMessage({ error: true, text: "Choose Claude’s conversations.json file, up to 200 MB." }),
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
    disabled: !!progress,
  });

  const trySample = async () => {
    try {
      const response = await fetch("/sample/claude-conversations.json");
      if (!response.ok) throw new Error();
      void start(new File([await response.blob()], "claude-conversations.json", { type: "application/json" }), true);
    } catch {
      setMessage({ error: true, text: "The sample could not load. Please try again." });
    }
  };

  return (
    <section className="dashboard-card" aria-label="Import an export">
      <h2>Import your Claude history</h2>
      <p>Drop the <b>conversations.json</b> file from your Claude data export. It’s read in your browser and never uploaded — only the totals are kept for this dashboard.</p>
      {progress ? (
        <div className="dashboard-progress" role="status">
          <LoaderCircle className="spin" size={18} /> {phaseLabels[progress.phase]}… {progress.total > 1 && `${Math.round((progress.done / progress.total) * 100)}%`}
          <button className="text-link" onClick={() => cancel.current?.()}>Cancel</button>
        </div>
      ) : (
        <div {...getRootProps({ className: `dropzone dashboard-drop${isDragActive ? " active" : ""}` })}>
          <input {...getInputProps()} aria-label="Choose an export file" />
          {isDragActive ? <FileArchive size={26} /> : <Upload size={26} />}
          <strong>{isDragActive ? "Drop to import" : "Drop conversations.json here, or click to choose"}</strong>
        </div>
      )}
      <div className="dashboard-row">
        <button className="text-link" disabled={!!progress} onClick={() => void trySample()}>
          No export handy? Try a fictional Claude sample
        </button>
        <span className="fine-print">In Claude: Settings → Privacy → Export data. The email link gives a ZIP; unzip it to find conversations.json.</span>
      </div>
      {message && (
        <p className={message.error ? "dashboard-error" : "dashboard-ok"} role={message.error ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </section>
  );
}

type Answer = { answer: string; citations: Array<{ url: string; title?: string }>; source: "snowflake" | "fallback" };

function AskBox({ categories, defaultTool }: { categories: string[]; defaultTool: string }) {
  const [tool, setTool] = useState(defaultTool in toolNames ? defaultTool : "claude");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Finding[]>([]);

  const ask = async (text: string) => {
    setError("");
    setAnswer(null);
    // Practise what we preach: never send personal details in the question itself.
    const findings = detectFast(text).findings;
    if (findings.length) {
      setFound(findings);
      return;
    }
    setFound([]);
    setBusy(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, question: text, categories }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error);
      setAnswer(data);
    } catch (e) {
      setError((e as Error).message || "Answers are unavailable right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const replaceAndAsk = () => {
    const safe = redactText(question, found, new PlaceholderMapper());
    setQuestion(safe);
    void ask(safe);
  };

  const examples = ["What happens to this data?", "What can I do about it?", "How do I delete my conversations?", "Is my chat used to train the model?"];

  return (
    <section className="dashboard-card ask-box" aria-label="Ask about your data">
      <h2>What happens to my data?</h2>
      <p>
        Ask a privacy or regulatory question. Answers come only from the official privacy policies of the tool you pick, with sources.
        {categories.length ? ` We’ll tailor it to what you’ve shared (${list(categories.slice(0, 4).map(label).map((l) => l.toLowerCase()))}${categories.length > 4 ? "…" : ""}) — category names only, never values.` : ""}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 3 && !busy) void ask(question.trim());
        }}
      >
        <select aria-label="AI tool" value={tool} onChange={(e) => setTool(e.target.value)}>
          {Object.entries(toolNames).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <textarea
          aria-label="Your question"
          rows={3}
          maxLength={500}
          placeholder="e.g. What happens to the personal details I shared? What can I do about it?"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setFound([]);
          }}
        />
        <button className="button primary" type="submit" disabled={busy || question.trim().length < 3}>
          {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />} Ask
        </button>
      </form>
      <div className="ask-examples">
        {examples.map((q) => (
          <button key={q} className="pill" disabled={busy} onClick={() => { setQuestion(q); void ask(q); }}>
            {q}
          </button>
        ))}
      </div>
      {!!found.length && (
        <div className="dashboard-error" role="alert">
          Your question contains personal information ({list([...new Set(found.map((f) => label(f.type)))])}). Mind your prompt!{" "}
          <button className="text-link" onClick={replaceAndAsk}>Replace it and ask</button>
        </div>
      )}
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      {answer && (
        <article className="panel ask-answer" aria-live="polite">
          <p>{answer.answer}</p>
          <div className="sources">
            {answer.citations
              .filter((c) => c.url.startsWith("https://"))
              .map((c) => (
                <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer">
                  {c.title || "Official source"} <ArrowUpRight size={13} />
                </a>
              ))}
          </div>
          <small className="fine-print">
            {answer.source === "snowflake"
              ? `Answered live from ${toolNames[tool]}’s policies (Snowflake Cortex).`
              : "Live answers are unavailable, so this is the closest pre-checked, cited answer."}{" "}
            Not legal advice.
          </small>
        </article>
      )}
    </section>
  );
}
