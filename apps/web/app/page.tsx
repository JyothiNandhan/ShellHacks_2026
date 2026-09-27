import Link from "next/link";
import {
  ArrowUpRight,
  LockKeyhole,
  ShieldCheck,
  Check,
} from "lucide-react";
import PrivacyVisual from "../components/PrivacyVisual";
import ExtensionCTA from "../components/ExtensionCTA";
export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> YOUR PRIVACY, BACK IN YOUR HANDS
          </div>
          <h1>
            Mind your
            <br /><span>Prompt!</span>
          </h1>
          <p className="hero-description">
            Catch personal information before you send it to AI. Review every
            paste and file, choose what to share, and understand your privacy.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button primary">
              Dashboard <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="micro">
            <LockKeyhole size={14} /> No account. No uploads. Just answers.
          </div>
        </div>
        <PrivacyVisual />
      </section>
      <div className="trust-strip">
        <span>
          <LockKeyhole size={16} /> 100% browser-based scanning
        </span>
        <span>
          <ShieldCheck size={16} /> Your export is never uploaded
        </span>
        <span>
          <Check size={16} /> No account required
        </span>
      </div>
      <section id="how-we-use-ai" className="section sponsor-section">
        <div className="section-heading"><div><span className="eyebrow">SHELLHACKS CHALLENGE FIT</span><h2>Built for real control.</h2></div></div>
        <div className="feature-grid">
          <article className="feature-card"><span className="eyebrow">ASSURANT · TAKE CONTROL OF AI</span><h3>Choose what you share.</h3><p>Review sensitive details before sending and track your AI privacy.</p></article>
          <article className="feature-card"><span className="eyebrow">MICROSOFT · WHAT’S MISSING?</span><h3>AI that reveals exposure.</h3><p>Local AI audits exported conversations and highlights private details—no chat window needed.</p></article>
          <article className="feature-card"><span className="eyebrow">SNOWFLAKE · BEST USE OF API</span><h3>Answers with evidence.</h3><p>Cortex Search retrieves policy sources; Snowflake AI explains retention, deletion and training.</p></article>
        </div>
      </section>
      <ExtensionCTA />
    </main>
  );
}
