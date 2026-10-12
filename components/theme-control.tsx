"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function snapshot() { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }
export function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("powertek-theme", next); } catch { /* Privacy mode still supports this session's theme. */ }
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>;
}
