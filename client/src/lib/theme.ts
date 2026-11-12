import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const key = "pact.theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

let preference = storedTheme();
let current: Theme = preference ?? (media.matches ? "dark" : "light");

function apply(theme: Theme) {
  current = theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#181c19" : "#f8f7f2");
  listeners.forEach((listener) => listener());
}

function onSystemChange() {
  if (!preference) apply(media.matches ? "dark" : "light");
}

function onStorageChange(event: StorageEvent) {
  if (event.key !== key && event.key !== null) return;
  preference = storedTheme();
  apply(preference ?? (media.matches ? "dark" : "light"));
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorageChange);
    apply(preference ?? (media.matches ? "dark" : "light"));
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorageChange);
    }
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => "light" as Theme,
  );
  function toggleTheme() {
    preference = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(key, preference);
    } catch {
      /* The preference still works for this visit. */
    }
    apply(preference);
  }
  return { theme, toggleTheme };
}
