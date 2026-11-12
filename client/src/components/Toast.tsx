import { useCallback, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, LoaderCircle, X } from "lucide-react";
import { ToastContext, type ToastKind } from "./toast-context";
import "./toast.css";

type ToastItem = { id: string; message: string; kind: ToastKind };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());
  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const show = useCallback((message: string, kind: ToastKind = "info", id: string = crypto.randomUUID()) => {
    const oldTimer = timers.current.get(id);
    if (oldTimer) window.clearTimeout(oldTimer);
    setItems((current) => [...current.filter((item) => item.id !== id), { id, message, kind }]);
    if (kind !== "loading") timers.current.set(id, window.setTimeout(() => dismiss(id), 4800));
    return id;
  }, [dismiss]);
  return <ToastContext.Provider value={{ show, dismiss }}>
    {children}
    <div className="pact-toasts" aria-label="Notifications" aria-live="polite" aria-relevant="additions text">
      {items.map((item) => <div className={`pact-toast pact-toast-${item.kind}`} key={item.id} role={item.kind === "error" ? "alert" : "status"}>
        <span className="pact-toast-icon" aria-hidden="true">{item.kind === "loading" ? <LoaderCircle className="spinner" size={18} /> : item.kind === "success" ? <Check size={18} /> : <CircleAlert size={18} />}</span>
        <span>{item.message}</span>
        {item.kind !== "loading" && <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}><X size={16} /></button>}
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function PactLoader({ message }: { message: string }) {
  return <main className="pact-loader" role="status" aria-live="polite">
    <span className="pact-loader-mark" aria-hidden="true"><i /><i /></span>
    <strong>pact<span>.</span></strong>
    <span>{message}</span>
  </main>;
}
