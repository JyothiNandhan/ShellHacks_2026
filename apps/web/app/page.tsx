import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  BookOpen,
  Check,
  CornerDownRight,
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
            <Link href="/scan" className="button primary">
              Scan my AI history <ArrowUpRight size={19} />
            </Link>
            <Link href="/#how-it-works" className="hero-secondary">
              See how it works <ArrowRight size={16} />
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
      <section id="how-it-works" className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A FRESH START FOR YOUR AI HISTORY</span>
            <h2>
              A little hindsight.
              <br />A lot more control.
            </h2>
          </div>
          <p>
            Privacy doesn’t have to be complicated.
            <br />
            Start with what you’ve shared. Decide what’s next.
          </p>
        </div>
        <div className="feature-grid">
          {[
            {
              n: "01",
              icon: ScanLine,
              title: "Scan your AI history",
              body: "Upload your ChatGPT, Claude or Gemini export on this website to see personal details, category counts and a privacy score. No extension required.",
              tag: "YOUR PRIVACY RECAP",
            },
            {
              n: "02",
              icon: ShieldCheck,
              title: "Look forward",
              body: "See replacement suggestions while typing. Paste or attach a file, then choose Replace and send or Send as is before it enters the AI composer.",
              tag: "PROTECTION AT THE GATE",
            },
            {
              n: "03",
              icon: BookOpen,
              title: "Know your tools",
              body: "Ask privacy and regulatory questions in your dashboard. Snowflake retrieves official policy sources and returns cited answers.",
              tag: "CLARITY, WITH CITATIONS",
            },
          ].map(({ n, icon: Icon, title, body, tag }) => (
            <article className="feature-card" key={n}>
              <div className="feature-top">
                <Icon size={25} />
                <span>{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="eyebrow">
                <CornerDownRight size={14} /> {tag}
              </span>
            </article>
          ))}
        </div>
      </section>
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
      <section id="privacy" className="privacy-banner">
        <LockKeyhole size={34} />
        <div>
          <h2>Your history stays yours. Period.</h2>
          <p>
            Your file never leaves your browser. Check the Network tab.
            <br />
            Model files download on first use and may be cached. When you ask
            a privacy question, only that question and the AI tool name go to our server and Snowflake.
          </p>
        </div>
        <Link href="/scan" className="text-link">
          Take a private look <ArrowRight size={17} />
        </Link>
      </section>
      <ExtensionCTA />
    </main>
  );
}
