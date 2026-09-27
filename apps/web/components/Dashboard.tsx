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
        <div className="metric-reset"><span>{sample ? "FICTIONAL DEMO · live activity excluded" : "Export history + new extension activity"}</span><button className="button secondary" onClick={reset}><RotateCcw size={15}/> Reset dashboard</button></div>
        <div className="summary-grid" aria-live="polite">
          {[
            ["Messages checked", totals.messages],
            ["Personal details detected", totals.findings],
            ["Categories detected", totals.categories],
            ["Privacy score", totals.score],
          ].map(([label, value]) => <div key={label}><div className="metric-label">{label}</div><strong>{value}{label === "Privacy score" && <i>/100</i>}</strong><small>{label === "Privacy score" ? "Starts at 100 · screening indicator" : sample ? "Fictional sample" : "Export + confirmed sends"}</small></div>)}
        </div>
        <p className="fine-print">{report ? `${report.messageCount} exported messages` : "No export scanned"}{stats ? ` · ${stats.prompts} confirmed live sends` : ""}. Importing replaces the previous export and includes only live sends after the new scan starts. Older live activity is excluded to avoid overlap; messages missing from an older export are not backfilled.</p>
        <details><summary>How the score works</summary><p className="fine-print">Starts at 100. A scan sets the export’s risk-based score. New confirmed sends subtract weighted penalties for personal details shared unchanged (1–15 points per detail), down to 0. Replaced details do not lower it. Reset clears this dashboard’s report and live totals. A score of 100 before scanning is a starting value, not proof of safety.</p></details>
        <p className="fine-print" role="status">{sample ? "Demo mode: your live activity is not mixed into these numbers." : stats ? "Extension connected · updates automatically after confirmed sends." : live.status === "connected" ? "Updating live totals. If this persists, install extension 0.4.2 and refresh your tabs." : "To include new prompts, install extension 0.4.2 and refresh your chatbot tabs and this page."}</p>
      </section>
    </div>
    <ScanFlow key={generation} onScanStart={start} onReport={setReport} onClear={clear}/>
  </>;
}
