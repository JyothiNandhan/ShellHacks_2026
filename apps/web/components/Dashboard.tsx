"use client";
import { useCallback, useState } from "react";
import { RotateCcw } from "lucide-react";
import ScanFlow from "./ScanFlow";
import { useLiveStats } from "../lib/dashboard/liveStats";
import { dashboardTotals } from "../lib/dashboard/totals";
import type { ScanReport } from "../lib/report/types";
export default function Dashboard() {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [since, setSince] = useState(0);
  const [sample, setSample] = useState(false);
  const [generation, setGeneration] = useState(0);
  const { live, resetLive } = useLiveStats(since);
  const stats = !sample && live.status === "connected" && (live.stats.since ?? 0) === since ? live.stats : null;
  const totals = dashboardTotals(report, stats);
  const start = useCallback((isSample: boolean) => {
    if (!isSample) setSince(Date.now());
    setSample(isSample); setReport(null);
  }, []);
  const clear = useCallback(() => { setReport(null); setSample(false); }, []);
  const reset = () => {
    setReport(null); setSample(false); setSince(Date.now()); setGeneration(v => v + 1);
    resetLive();
  };
  return <>
    <div className="scan-shell">
      <div className="scan-heading">
        <span className="eyebrow">YOUR PRIVACY DASHBOARD</span>
        <h1>Your history. <span>Your control.</span></h1>
        <p>Scan an export and track new prompts in one place.</p>
      </div>
      <section aria-label="Combined privacy totals">
        <div className="metric-reset"><span>{sample ? "FICTIONAL DEMO · live activity excluded" : "Export history and extension activity"}</span><button className="button secondary" onClick={reset}><RotateCcw size={15}/> Reset dashboard</button></div>
        <div className="summary-grid" aria-live="polite">
          {[
            ["Messages checked", totals.messages],
            ["Personal details detected", totals.findings],
            ["Categories detected", totals.categories],
            ["Privacy score", totals.score],
          ].map(([label, value]) => <div key={label}><div className="metric-label">{label}</div><strong>{value}{label === "Privacy score" && <i>/100</i>}</strong><small>{label === "Privacy score" ? "Starts at 100 · screening indicator" : sample ? "Fictional sample" : "Export + confirmed sends"}</small></div>)}
        </div>
      </section>
    </div>
    <ScanFlow key={generation} onScanStart={start} onReport={setReport} onClear={clear}/>
  </>;
}
