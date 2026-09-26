"use client";
import { TOOL_SAFETY_MOCK } from "../lib/integration/tool-safety-mock";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, RefreshCw } from "lucide-react";
type Safety = {
  toolId: string;
  toolName: string;
  answers: Array<{
    questionId: "training" | "retention" | "opt_out" | "delete";
    question: string;
    answer: string;
    citations: Array<{ url: string; title?: string }>;
  }>;
  generatedAt: string;
  source: "snowflake" | "cache" | "fallback";
};
const safeUrl = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};
export default function ToolSafety({
  tool = "chatgpt",
}: {
  tool?: "chatgpt" | "claude" | "gemini";
}) {
  const [data, setData] = useState<Safety | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tool-safety?tool=${tool}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (
          data.toolId !== tool ||
          !Array.isArray(data.answers) ||
          !["snowflake", "cache", "fallback"].includes(data.source) ||
          !Number.isFinite(Date.parse(data.generatedAt))
        )
          throw new Error();
        const ids = ["training", "retention", "opt_out", "delete"];
        if (
          data.answers.length !== 4 ||
          !ids.every((id) =>
            data.answers.some(
              (a: Safety["answers"][number]) =>
                a.questionId === id &&
                typeof a.question === "string" &&
                typeof a.answer === "string" &&
                Array.isArray(a.citations) &&
                a.citations.every(
                  (c) =>
                    typeof c.url === "string" &&
                    (c.title === undefined || typeof c.title === "string"),
                ),
            ),
          )
        )
          throw new Error();
        setData(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(true);
          setData(TOOL_SAFETY_MOCK);
        }
      });
    return () => controller.abort();
  }, [attempt, tool]);
  return (
    <section className="report-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <BookOpen size={15} /> KNOW YOUR TOOLS
          </span>
          <h2>
            What{" "}
            {{ chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini" }[tool]}{" "}
            does with your data.
          </h2>
        </div>
        <span className="pill">Only the tool name is sent</span>
      </div>
      {error && (
        <div className="empty-card">
          <h3>Policy answers are unavailable right now.</h3>
          <p>
            SAMPLE — Local mock cards are shown below. These are placeholders,
            not verified policy answers.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setError(false);
              setData(null);
              setAttempt((a) => a + 1);
            }}
          >
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}
      {!data ? (
        <div className="empty-card" role="status">
          Loading four cited policy answers…
        </div>
      ) : (
        <>
          <div className="policy-grid">
            {data.answers.map((a) => (
              <article className="panel" key={a.questionId}>
                <h3>{a.question}</h3>
                <p>{a.answer}</p>
                <div className="sources">
                  {a.citations
                    .filter((c) => safeUrl(c.url))
                    .map((c, i) => (
                      <a
                        key={i}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.title || "Official source"}{" "}
                        <ArrowUpRight size={13} />
                      </a>
                    ))}
                </div>
              </article>
            ))}
          </div>
          <p className="fine-print">
            {error
              ? "Sample fixture — sources not checked"
              : `Sources checked ${new Date(data.generatedAt).toLocaleDateString()}`}{" "}
            ·{" "}
            {data.source === "fallback"
              ? "Fallback answers"
              : data.source === "cache"
                ? "Cached answers"
                : "Snowflake-backed answers"}
          </p>
        </>
      )}
    </section>
  );
}
