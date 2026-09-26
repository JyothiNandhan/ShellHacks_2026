"use client";
import { RotateCcw, Radio } from "lucide-react";
import { useLiveStats } from "../lib/dashboard/liveStats";
export default function LiveActivity() {
  const { live, resetLive } = useLiveStats();
  const stats = live.status === "connected" ? live.stats : null;
  return (
    <section className="live-activity" aria-label="Live extension activity">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <Radio size={15} /> LIVE EXTENSION ACTIVITY
          </span>
          <h2>What you send. In real time.</h2>
          <p>
            Separate from this export report. Only totals and category names
            are shared locally with this page, never your prompt text.
          </p>
        </div>
        <button className="button secondary" disabled={!stats} onClick={() => {
          if (window.confirm("Reset live website totals? Your uploaded export report and extension history will stay unchanged.")) resetLive();
        }}><RotateCcw size={15} /> Reset live totals</button>
      </div>
      <div className="summary-grid">
        {[
          { label: "Prompts sent", value: stats?.prompts ?? "—" },
          { label: "Details shared as is", value: stats?.shared ?? "—" },
          { label: "Categories shared", value: stats?.categories.length ?? "—" },
          { label: "Live privacy score", value: stats?.score ?? "—" },
        ].map((item) => (
          <div key={item.label}>
            <div className="metric-label">{item.label}</div>
            <strong>{item.value}</strong>
            <small>
              {stats?.prompts
                ? "Confirmed in the chatbot interface"
                : stats ? "No confirmed sends yet" : "Extension not connected"}
            </small>
          </div>
        ))}
      </div>
      <p className="fine-print">{stats ? `${stats.conversations} conversations tracked. ` : ""}Live totals start when extension 0.4.1 is installed. Score starts at 100 and drops by the weighted personal details sent unchanged; replaced details do not lower it. Export scans stay separate.</p>
      <p className="fine-print" role="status">
        {live.status === "error"
          ? "Extension connection failed. Reload the extension and this page."
          : stats
            ? "Connected · updates after a sent message appears."
            : "Install the latest extension ZIP, then reload this page to connect."}
      </p>
    </section>
  );
}
