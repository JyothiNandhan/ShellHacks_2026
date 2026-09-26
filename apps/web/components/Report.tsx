"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  RotateCcw,
  ShieldCheck,
  MessagesSquare,
  ScanLine,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { EXPLANATIONS } from "@promptshield/engine";
import type { Category, ScanReport } from "../lib/report/types";
import { SCORE_EXPLANATION } from "../lib/report/buildReport";
import { CategoryChart, TimelineChart } from "./Charts";
import ToolSafety from "./ToolSafety";
export default function Report({
  report,
  sample,
  onReset,
  onReplay,
}: {
  report: ScanReport;
  sample: boolean;
  onReset: () => void;
  onReplay: () => void;
}) {
  const [initialStorage] = useState(() => {
    try {
      const value: unknown = JSON.parse(
        sessionStorage.getItem("promptshield:cleaned") ?? "[]",
      );
      return {
        cleaned: Array.isArray(value)
          ? value.filter((v): v is string => typeof v === "string")
          : [],
        error: false,
      };
    } catch {
      return { cleaned: [] as string[], error: true };
    }
  });
  const [cleaned, setCleaned] = useState<string[]>(initialStorage.cleaned);
  const [storageError, setStorageError] = useState(initialStorage.error);
  const toggle = (id: string) => {
    const next = cleaned.includes(id)
      ? cleaned.filter((v) => v !== id)
      : [...cleaned, id];
    setCleaned(next);
    try {
      sessionStorage.setItem("promptshield:cleaned", JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  };
  const count = report.riskiestConversations.filter((c) =>
    cleaned.includes(c.conversationId),
  ).length;
  return (
    <div className="report">
      <div className="dashboard-breadcrumb">
        <span>
          <LayoutDashboard size={15} /> Your workspace
        </span>
        <span>/</span>
        <strong>Privacy overview</strong>
        <span className="workspace-status">
          <span className="live-dot" /> Local session
        </span>
      </div>
      <div className="report-heading">
        <div>
          <span className="eyebrow">
            <span className="live-dot" /> YOUR LOCAL AUDIT IS READY{" "}
            {sample ? "· SYNTHETIC SAMPLE" : ""}
          </span>
          <h1>
            A clearer picture.
            <br />
            <span>A fresh start.</span>
          </h1>
          <p>Your history has a story. Here’s what’s worth a second look.</p>
        </div>
        <div className="report-actions">
          <button className="button secondary" onClick={onReplay}>
            Replay recap
          </button>
          <button className="text-link" onClick={onReset}>
            <RotateCcw size={14} /> Clear report & start over
          </button>
        </div>
      </div>
      {report.aiNameDetection && (
        <p className="pill" role="status">
          <ShieldCheck size={14} /> AI name detection is on · processed locally
        </p>
      )}
      {!report.aiNameDetection && (
        <p className="fine-print">
          Local AI name detection was unavailable. Names and places may be
          missed. When available, AI scans up to 400 recent eligible messages;
          pattern checks scan every user message.
        </p>
      )}
      <div className="summary-grid">
        <div>
          <div className="metric-label">
            <span>Conversations</span>
            <MessagesSquare size={19} />
          </div>
          <strong>{report.conversationCount}</strong>
          <small>
            {report.messageCount.toLocaleString()} user messages scanned
          </small>
        </div>
        <div>
          <div className="metric-label">
            <span>Chats with findings</span>
            <ScanLine size={19} />
          </div>
          <strong>{report.conversationsWithFindings}</strong>
          <small>Worth taking another look</small>
        </div>
        <div>
          <div className="metric-label">
            <span>Categories detected</span>
            <Layers size={19} />
          </div>
          <strong>{Object.keys(report.countsByType).length}</strong>
          <small>Personal details and sensitive topics</small>
        </div>
        <div className="score-tile">
          <div className="metric-label">
            <span>
              Privacy score{" "}
              <button
                className="info-button"
                title={SCORE_EXPLANATION}
                aria-label={SCORE_EXPLANATION}
              >
                ⓘ
              </button>
            </span>
            <ShieldCheck size={19} />
          </div>
          <strong>
            {report.privacyScore}
            <i>/100</i>
          </strong>
          <small>A screening indicator, not a guarantee</small>
        </div>
      </div>
      <section className="report-section cleanup-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">START HERE</span>
            <h2>Clean up your riskiest chats.</h2>
            <p>
              Review each conversation in ChatGPT, then mark it cleaned here.
            </p>
          </div>
          <span className="pill">
            <Check size={14} /> {count} of {report.riskiestConversations.length}{" "}
            cleaned
          </span>
        </div>
        <p className="fine-print">
          Chat titles are hidden to protect personal details. Marking a chat
          cleaned does not delete it. Deletion cannot undo information already
          used or retained.
        </p>
        {sample && (
          <p className="fine-print">
            Sample conversations are synthetic; their ChatGPT links do not point
            to real chats.
          </p>
        )}
        {storageError && (
          <p role="status" className="fine-print">
            Session storage is unavailable. Cleanup marks will last only while
            this report is open.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conversation</th>
                <th>What we found</th>
                <th>Last shared</th>
                <th>Take action</th>
                <th>Cleaned</th>
              </tr>
            </thead>
            <tbody>
              {report.riskiestConversations.map((c) => (
                <tr
                  key={c.conversationId}
                  className={
                    cleaned.includes(c.conversationId) ? "cleaned" : ""
                  }
                >
                  <td>
                    <strong>{c.title}</strong>
                    <small>{c.riskScore} risk points</small>
                  </td>
                  <td>
                    <div className="tags">
                      {c.types.map((t) => (
                        <span key={t}>{EXPLANATIONS[t].label}</span>
                      ))}
                    </div>
                    <small>{c.examples.map((e) => e.masked).join(" · ")}</small>
                  </td>
                  <td>
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Unknown"}
                  </td>
                  <td>
                    <a
                      className="text-link"
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in ChatGPT <ArrowUpRight size={14} />
                    </a>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Mark ${c.title} cleaned`}
                      checked={cleaned.includes(c.conversationId)}
                      onChange={() => toggle(c.conversationId)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.riskiestConversations.length && (
            <div className="empty-card">
              No findings detected. Detection is best-effort; you can still
              review your chats manually.
            </div>
          )}
        </div>
      </section>
      <section className="report-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE BIGGER PICTURE</span>
            <h2>What you’ve shared.</h2>
          </div>
        </div>
        <div className="chart-grid">
          <article className="panel">
            <h3>Personal details, by category</h3>
            <CategoryChart report={report} />
          </article>
          <article className="panel">
            <h3>Chats with findings, over time</h3>
            <TimelineChart report={report} />
          </article>
        </div>
        <div className="category-grid">
          {Object.entries(report.countsByType).map(([type, count]) => (
            <article key={type} className="category-item">
              <span className="category-count">{count}</span>
              <div>
                <h3>{EXPLANATIONS[type as Category].label}</h3>
                <p>{EXPLANATIONS[type as Category].why}</p>
                <small>
                  {report.topRepeated
                    .filter((f) => f.type === type)
                    .map((f) => f.masked)
                    .join(" · ") || "Sensitive category · values hidden"}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
      <ToolSafety />
      <div className="report-end">
        <ShieldCheck size={28} />
        <p>
          Your report stays in this tab. Only cleanup checkmarks are saved for
          this browser session.
        </p>
      </div>
    </div>
  );
}
