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
      <section id="how-we-use-ai" className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW WE USE AI</span>
            <h2>AI that works on your device.</h2>
          </div>
          <p>
            Find personal details that simple patterns can miss, without sending
            your conversations away for analysis.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>More than pattern matching</h3>
            <p>
              Xenova/bert-base-NER identifies names, places, and organizations
              inside your browser using Transformers.js and ONNX Runtime Web. It
              complements detection rules, checksum validation where applicable,
              and a first-name dictionary.
            </p>
          </article>
          <article className="feature-card">
            <h3>Your text stays local</h3>
            <p>
              Model files download on first use and can be cached for later
              scans. Your export is processed on your device and is never sent
              to a server for inference. You can verify this in DevTools: model
              downloads are expected; export uploads are not.
            </p>
          </article>
          <article className="feature-card">
            <h3>Checked against known examples</h3>
            <p>
              Our 220-chat synthetic export matched planted conversation counts
              across ten categories, including 40 with names, 23 with emails, 14
              with addresses, and nine with phone numbers. The engine team
              reports 134 passing tests. Synthetic results do not establish
              accuracy on every real-world conversation.
            </p>
          </article>
        </div>
      </section>
      <ExtensionCTA />
    </main>
  );
}
