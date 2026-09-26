"use client";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { useLiveStats } from "../lib/dashboard/liveStats";
export default function LiveActivity() {
  const { live } = useLiveStats();
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
        <Link className="button secondary" href="/dashboard">
          Open dashboard <ArrowRight size={15} />
        </Link>
      </div>
      <div className="summary-grid">
        {[
          { label: "Conversations with AI", value: stats?.conversations ?? 0 },
          { label: "Details shared as is", value: stats?.shared ?? 0 },
          { label: "Categories shared", value: stats?.categories.length ?? 0 },
          { label: "Live privacy score", value: stats?.score ?? 100 },
        ].map((item) => (
          <div key={item.label}>
            <div className="metric-label">{item.label}</div>
            <strong>{item.value}</strong>
            <small>
              {stats?.prompts
                ? "Confirmed in the chatbot interface"
                : "No confirmed sends yet"}
            </small>
          </div>
        ))}
      </div>
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
