import { useSyncExternalStore } from "react";

const key = "pact.demo.session";
const listeners = new Set<() => void>();
let token: string | null = null;
try {
  token = sessionStorage.getItem(key);
} catch {
  /* Storage may be disabled. */
}

export const session = {
  get: () => token,
  set(value: string | null) {
    token = value;
    try {
      if (value) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    } catch {
      /* Keep the session in memory if storage is disabled. */
    }
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSession() {
  return useSyncExternalStore(session.subscribe, session.get, () => null);
}
