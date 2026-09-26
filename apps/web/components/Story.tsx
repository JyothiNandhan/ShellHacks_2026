"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play, ShieldCheck } from "lucide-react";
import { EXPLANATIONS } from "@promptshield/engine";
import { CategoryChart, TimelineChart } from "./Charts";
import { SCORE_EXPLANATION } from "../lib/report/buildReport";
import type { ScanReport } from "../lib/report/types";
export function Score({ value }: { value: number }) {
  return (
    <div
      className="score-ring"
      style={{ "--score": `${value}%` } as React.CSSProperties}
      title={SCORE_EXPLANATION}
    >
      <div>
        <strong>{value}</strong>
        <span>OUT OF 100</span>
      </div>
    </div>
  );
}
export default function Story({
  report,
  onFinish,
}: {
  report: ScanReport;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => {
    if (index === 7) onFinish();
    else setIndex((i) => i + 1);
  }, [index, onFinish]);
  useEffect(() => {
    if (paused || reduced) return;
    const id = setTimeout(next, 5000);
    return () => clearTimeout(id);
  }, [next, paused, reduced]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [next]);
  const top = report.topRepeated[0];
  const screens = [
    <>
      <span className="eyebrow">A LOT OF CONVERSATIONS. ONE BIG PICTURE.</span>
      <h2>
        You’ve had <em>{report.conversationCount}</em>
        <br />
        {report.activityBased
          ? "chats / activity entries."
          : "conversations in your export."}
      </h2>
      <p>
        Since{" "}
        {report.dateRange.from
          ? new Date(report.dateRange.from).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          : "your first exported chat"}
        .
      </p>
    </>,
    <>
      <span className="eyebrow">THE DETAILS ADD UP</span>
      <h2>
        Personal details appeared
        <br />
        in <em>{report.conversationsWithFindings}</em> of them.
      </h2>
      <p>Knowing where they are is the first step to taking control.</p>
    </>,
    <>
      <span className="eyebrow">A FAMILIAR DETAIL</span>
      <h2>
        {top ? EXPLANATIONS[top.type].label : "No personal details detected"}
        {top && (
          <>
            .<br />
            <em>{top.conversationCount}</em> chats.
          </>
        )}
      </h2>
      <p>
        {top
          ? `Your most repeated item: ${top.masked}`
          : "Detection is best-effort. No findings does not guarantee no sensitive data."}
      </p>
    </>,
    <>
      <span className="eyebrow">WHAT YOU’VE SHARED</span>
      <h2>Small details. A bigger picture.</h2>
      <CategoryChart report={report} />
    </>,
    <>
      <span className="eyebrow">SOME CONVERSATIONS ARE PERSONAL</span>
      <h2>
        Health came up in
        <br />
        <em>{report.countsByType.HEALTH ?? 0}</em> chats.
      </h2>
      <p>
        Finance: {report.countsByType.FINANCE ?? 0} chats · Legal:{" "}
        {report.countsByType.LEGAL ?? 0} chats
      </p>
    </>,
    <>
      <span className="eyebrow">YOUR HISTORY, OVER TIME</span>
      <h2>A little perspective.</h2>
      <TimelineChart report={report} />
    </>,
    <>
      <span className="eyebrow">YOUR PRIVACY SNAPSHOT</span>
      <Score value={report.privacyScore} />
      <p>A starting point for review, not a security guarantee.</p>
    </>,
    <>
      <ShieldCheck size={56} strokeWidth={1.2} />
      <h2>
        A fresh start
        <br />
        starts <em>here.</em>
      </h2>
      <p>Let’s find the conversations worth cleaning up.</p>
      <button className="button primary" onClick={onFinish}>
        Let’s clean it up <ArrowRight size={17} />
      </button>
    </>,
  ];
  return (
    <section className="story">
      <div className="story-progress">
        {screens.map((_, i) => (
          <button
            aria-label={`Story slide ${i + 1}`}
            aria-current={i === index ? "step" : undefined}
            key={i}
            onClick={() => setIndex(i)}
            className={i <= index ? "filled" : ""}
          />
        ))}
      </div>
      <div className="story-meta">
        <span>YOUR AI PRIVACY RECAP · {index + 1} / 8</span>
        <button className="text-link" onClick={onFinish}>
          Skip to report <ArrowRight size={15} />
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="story-content"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {screens[index]}
        </motion.div>
      </AnimatePresence>
      <div className="story-controls">
        <button
          className="icon-button"
          aria-label="Previous slide"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          <ArrowLeft size={19} />
        </button>
        <button className="text-link" onClick={() => setPaused((p) => !p)}>
          {paused || reduced ? <Play size={14} /> : <Pause size={14} />}{" "}
          {reduced
            ? "Manual navigation"
            : paused
              ? "Resume story"
              : "Pause story"}
        </button>
        <button className="icon-button" aria-label="Next slide" onClick={next}>
          <ArrowRight size={19} />
        </button>
      </div>
    </section>
  );
}
