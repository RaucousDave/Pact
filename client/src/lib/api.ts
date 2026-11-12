import axios from "axios";
import { session } from "./session";

// Use the same-origin Vite proxy locally, and the HTTPS backend in production.
export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
      ? "/api/v1"
      : "https://pact-backend.fastapicloud.dev/api/v1"),
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = session.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      (error.config?.url === "/auth/me" || error.config?.url === "/users/me")
    )
      session.set(null);
    return Promise.reject(error);
  },
);

export function apiError(error: unknown): string {
  if (!axios.isAxiosError(error))
    return "Something went wrong. Please try again.";
  if (error.code === "ECONNABORTED")
    return "This is taking longer than expected. If you were creating an account, try signing in before submitting again.";
  if (!error.response)
    return "We couldn’t reach Pact. Check your connection and try again.";
  const detail: unknown = error.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((issue: { msg?: string }) => issue.msg || "Check your details.")
      .join(" ");
  return error.response.status >= 500
    ? "Pact is temporarily unavailable. Please try again shortly."
    : "We couldn’t complete that request. Please check your details.";
}
