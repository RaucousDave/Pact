import { createContext, useContext } from "react";

export type ToastKind = "loading" | "success" | "error" | "info";
export type ToastApi = {
  show: (message: string, kind?: ToastKind, id?: string) => string;
  dismiss: (id: string) => void;
};
export const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside ToastProvider");
  return toast;
}
