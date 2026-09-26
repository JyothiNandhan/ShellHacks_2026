"use client";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle, Send } from "lucide-react";
import { detectFast, EXPLANATIONS, PlaceholderMapper, redactText, type Finding } from "@promptshield/engine";
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
const label = (c: string) => EXPLANATIONS[c as keyof typeof EXPLANATIONS]?.label ?? c;
const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
type Answer = { answer: string; citations: Array<{ url: string; title?: string }>; source: "snowflake" | "fallback" };

export default function PrivacyQuestions({ categories, defaultTool }: { categories: string[]; defaultTool: string }) {
  const [tool, setTool] = useState(defaultTool in toolNames ? defaultTool : "chatgpt");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Finding[]>([]);

  const ask = async (text: string) => {
    setError("");
    setAnswer(null);
    // Check common sensitive patterns before sending the question.
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
        Ask a privacy or regulatory question. Snowflake searches the selected tool’s policy documents to answer with sources. Your question, selected tool and detected category names are sent to the API; your export and detected values stay in your browser. Avoid including private details in your question.
        {categories.length ? ` We’ll tailor it to what you’ve shared (${list(categories.slice(0, 4).map(label).map((l) => l.toLowerCase()))}${categories.length > 4 ? "…" : ""}) — category names only, never values.` : ""}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 3 && !busy) void ask(question.trim());
        }}
      >
        <select disabled={busy} aria-label="AI tool" value={tool} onChange={(e) => setTool(e.target.value)}>
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
