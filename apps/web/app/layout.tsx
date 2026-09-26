import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import "./globals.css";
import ThemeSwitcher from "../components/ThemeSwitcher";
export const metadata: Metadata = {
  title: "Mind Your Prompt — Take back your AI privacy",
  description:
    "See what you have shared with AI. Audit your ChatGPT history locally, find sensitive conversations, and take control.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="ambient-background" aria-hidden="true">
          <div />
          <div />
          <div />
        </div>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Mind Your Prompt home">
            <span className="brand-icon">
              <ShieldCheck size={22} />
            </span>
            Mind Your Prompt
          </Link>
          <nav aria-label="Main navigation">
            <ThemeSwitcher />
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#privacy">Our privacy promise</Link>
            <Link className="nav-cta" href="/scan">
              Scan my history <ArrowUpRight size={16} />
            </Link>
          </nav>
        </header>
        {children}
        <footer>
          <Link className="brand" href="/">
            <ShieldCheck size={19} /> Mind Your Prompt
          </Link>
          <span>Your conversations. Your business.</span>
          <span>Built for a more private internet ↗</span>
        </footer>
      </body>
    </html>
  );
}
