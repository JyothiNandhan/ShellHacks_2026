"use client";
import { useEffect, useState } from "react";
import { Radio, RotateCcw } from "lucide-react";
type Stats = {
  version: number;
  prompts: number;
  findings: number;
  shared: number;
  protected: number;
  score: number;
};
export default function LiveActivity() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const send = (type: string) =>
    window.postMessage(
      { source: "mindyourprompt-website", type },
      location.origin,
    );
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.source !== window ||
        e.origin !== location.origin ||
        e.data?.source !== "mindyourprompt-extension"
      )
        return;
      if (e.data.type === "ERROR") {
        setFailed(true);
        setResetting(false);
        return;
      }
      const s = e.data.stats;
      if (
        e.data.type === "STATS" &&
        s?.version === 1 &&
        ["prompts", "findings", "shared", "protected", "score"].every(
          (k) => Number.isFinite(s[k]) && s[k] >= 0,
        ) &&
        s.score <= 100
      ) {
        setStats(s);
        setFailed(false);
        setResetting(false);
      }
    };
    window.addEventListener("message", receive);
    send("GET_STATS");
    const retry = setInterval(() => send("GET_STATS"), 5000);
    return () => {
      window.removeEventListener("message", receive);
      clearInterval(retry);
    };
  }, []);
  return (
    <section className="live-activity" aria-label="Live extension activity">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <Radio size={15} /> LIVE EXTENSION ACTIVITY
          </span>
          <h2>What you send. In real time.</h2>
          <p>
            Separate from your export report. Only sent-prompt totals and a
            score are shared locally with this page, never your prompt text.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={!stats || resetting || !stats.prompts}
          onClick={() => {
            if (
              window.confirm(
                "Reset extension activity and score on this device? Your export report and settings stay unchanged.",
              )
            ) {
              setResetting(true);
              send("RESET_STATS");
            }
          }}
        >
          <RotateCcw size={15} />
          {resetting ? "Resetting…" : "Reset live metrics"}
        </button>
      </div>
      <div className="summary-grid">
        {[
          { label: "Prompts sent", value: stats?.prompts },
          { label: "Details shared as is", value: stats?.shared },
          { label: "Details replaced on send", value: stats?.protected },
          { label: "Live privacy score", value: stats?.score },
        ].map((item) => (
          <div key={item.label}>
            <div className="metric-label">{item.label}</div>
            <strong>{item.value ?? 0}</strong>
            <small>
              {stats?.prompts
                ? "Confirmed in the chatbot interface"
                : "No confirmed sends yet"}
            </small>
          </div>
        ))}
      </div>
      <p className="fine-print" role="status">
        {failed
          ? "Extension connection failed. Reload the extension and this page."
          : stats
            ? "Connected · updates after a sent message appears. Score uses the last 5,000 recorded details."
            : "Install the latest extension ZIP, then reload this page to connect. Existing unpacked installations need to be updated manually."}
      </p>
    </section>
  );
}
