import {
  ShieldCheck,
  LockKeyhole,
  ScanLine,
  ArrowUpRight,
  Fingerprint,
  Check,
  Sparkles,
} from "lucide-react";
export default function PrivacyVisual() {
  return (
    <div
      className="hero-visual"
      aria-label="Illustration of a private conversation audit"
    >
      <div className="visual-glow" />
      <div className="visual-top">
        <span className="window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>
          <LockKeyhole size={11} /> LOCAL PRIVACY WORKSPACE
        </span>
        <ArrowUpRight size={14} />
      </div>
      <div className="visual-scene">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />
        <div className="orbit-node node-a">
          <Fingerprint size={23} />
        </div>
        <div className="orbit-node node-b">
          <LockKeyhole size={20} />
        </div>
        <div className="orbit-node node-c">
          <ScanLine size={22} />
        </div>
        <div className="shield-art">
          <ShieldCheck strokeWidth={1.2} size={94} />
          <span className="shield-spark">
            <Sparkles size={17} />
          </span>
        </div>
        <span className="scene-label">
          A little clarity. A lot more control.
        </span>
      </div>
      <div className="visual-audit">
        <div className="audit-heading">
          <span>
            <span className="live-dot" /> YOUR HISTORY, DECODED
          </span>
          <span>ILLUSTRATION</span>
        </div>
        <div className="audit-row">
          <span className="audit-icon">
            <Fingerprint size={17} />
          </span>
          <div>
            <strong>Personal details</strong>
            <small>•••••••• &nbsp; ••••••••</small>
          </div>
          <span className="audit-tag">Made visible</span>
        </div>
        <div className="audit-row">
          <span className="audit-icon violet">
            <ScanLine size={17} />
          </span>
          <div>
            <strong>Sensitive conversations</strong>
            <small>Understand what’s worth revisiting</small>
          </div>
          <ArrowUpRight size={16} />
        </div>
      </div>
      <div className="visual-bottom">
        <span>
          <LockKeyhole size={12} /> YOUR DEVICE. YOUR DATA.
        </span>
        <span>
          <Check size={13} /> No upload required
        </span>
      </div>
      <div className="floating-note">
        <span className="small-check">
          <ShieldCheck size={19} />
        </span>
        <div>
          Private by design<small>Everything stays with you.</small>
        </div>
      </div>
    </div>
  );
}
