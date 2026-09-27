"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

const examples = [
  {
    label: "Email",
    before: "alex.rivera@example.com",
    after: "[EMAIL]",
    context: "Send the itinerary to",
  },
  {
    label: "Name",
    before: "Alex Rivera",
    after: "[NAME]",
    context: "Write an introduction for",
  },
  {
    label: "Address",
    before: "742 Evergreen Terrace",
    after: "[ADDRESS]",
    context: "Find a route from",
  },
];
export default function PrivacyVisual() {
  const [selected, setSelected] = useState(0);
  const [masked, setMasked] = useState(false);
  const example = examples[selected];
  return (
    <div className="privacy-studio">
      <div className="studio-caption">
        <span>THE LITTLE THINGS YOU SHARE</span>
        <span>0{selected + 1} / 03</span>
      </div>
      <div className="studio-orbit" aria-hidden="true" />
      <div className="prompt-paper">
        <div className="paper-heading">
          <span className="paper-dot" /> A familiar conversation{" "}
          <ArrowUpRight size={17} />
        </div>
        <p
          className="paper-prompt"
          aria-live="polite"
          key={`${selected}-${masked}`}
        >
          {example.context}
          <br />
          <mark className={masked ? "is-masked" : ""}>
            {masked ? example.after : example.before}
          </mark>
        </p>
        <div className="paper-rule" />
        <div
          className="example-tabs"
          role="group"
          aria-label="Example personal detail"
        >
          {examples.map((item, index) => (
            <button
              key={item.label}
              aria-pressed={selected === index}
              onClick={() => {
                setSelected(index);
                setMasked(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          className="mask-control"
          aria-pressed={masked}
          onClick={() => setMasked(!masked)}
        >
          {masked ? <Eye size={18} /> : <EyeOff size={18} />}
          {masked ? "Show original example" : "Give this detail some privacy"}
          <span>{masked ? <Check size={17} /> : "↗"}</span>
        </button>
        <small>Interactive illustration · fictional details</small>
      </div>

    </div>
  );
}
