"use client";
import { useState } from "react";
import { MoonStar, Waves, Sun } from "lucide-react";
const themes = [
  { id: "aurora", label: "Forest", icon: MoonStar },
  { id: "ocean", label: "Midnight", icon: Waves },
  { id: "daylight", label: "Paper", icon: Sun },
];
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("daylight");
  return (
    <div className="theme-switcher" role="group" aria-label="Color theme">
      {themes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={`${label} theme`}
          aria-label={`${label} theme`}
          aria-pressed={theme === id}
          onClick={() => {
            document.documentElement.dataset.theme = id;
            setTheme(id);
          }}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
