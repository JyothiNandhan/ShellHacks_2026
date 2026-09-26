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
            You’ve told AI
            <br />a lot.
            <br />
            <span>Let’s look back.</span>
          </h1>
          <p className="hero-description">
            See what you’ve already told AI, and stop telling it more. A private
            look at the personal details hiding in your ChatGPT history.
          </p>
          <Link href="/scan" className="button primary">
            Scan my AI history <ArrowUpRight size={19} />
          </Link>
          <div className="micro">
            <LockKeyhole size={14} /> No account. No uploads. Just answers.
          </div>
        </div>
        <div
          className="hero-visual"
          aria-label="Illustration of a private conversation audit"
        >
          <div className="visual-top">
            <span>
              <span className="live-dot" /> A LITTLE CLARITY
            </span>
            <span>01 / LOOK BACK</span>
          </div>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="shield-art">
            <ShieldCheck strokeWidth={1.15} size={128} />
          </div>
          <div className="floating-note note-one">
            <span className="note-icon">
              <ScanLine size={22} />
            </span>
            <div>
              Your history, decoded.
              <small>The details you didn’t mean to share.</small>
            </div>
          </div>
          <div className="floating-note note-two">
            <LockKeyhole size={17} />
            <span>Stays on your device</span>
            <span className="small-check">
              <Check size={13} />
            </span>
          </div>
          <div className="visual-bottom">
            <span>PRIVATE BY DESIGN</span>
            <div className="bar-code">|||| ||| || ||||| |||</div>
          </div>
        </div>
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
              title: "Look back",
              body: "Drop in your ChatGPT export. See the patterns, personal details, and conversations worth revisiting.",
              tag: "YOUR PRIVACY RECAP",
            },
            {
              n: "02",
              icon: ShieldCheck,
              title: "Look forward",
              body: "Catch sensitive information at the moment you paste or send with our Chrome extension.",
              tag: "PROTECTION AT THE GATE",
            },
            {
              n: "03",
              icon: BookOpen,
              title: "Know your tools",
              body: "Understand training, retention, opt-outs, and deletion with answers linked to their sources.",
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
      <section id="privacy" className="privacy-banner">
        <LockKeyhole size={34} />
        <div>
          <h2>Your history stays yours. Period.</h2>
          <p>
            Your file never leaves your browser. Check the Network tab.
            <br />
            The local AI model may download once. Policy cards send only the
            tool name.
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
