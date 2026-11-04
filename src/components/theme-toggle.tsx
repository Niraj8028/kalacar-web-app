"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/icons";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("kalacar-theme");
    const initial: Theme = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("kalacar-theme", next);
    setTheme(next);
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={"Switch to " + (theme === "light" ? "dark" : "light") + " theme"}
      title={"Switch to " + (theme === "light" ? "dark" : "light") + " theme"}
    >
      {theme === "light" ? <><Moon /> Dark</> : <><Sun /> Light</>}
    </button>
  );
}
