import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { MotionConfig } from "motion/react";
import { PactLoader, ToastProvider } from "./components/Toast";
import { LandingPage } from "./pages/LandingPage";
import "./App.css";
import "./motion.css";
import "./theme.css";
import "./dark.css";
import "./onboarding.css";

const PreviewPage = lazy(() =>
  import("./pages/PreviewPage").then((module) => ({
    default: module.PreviewPage,
  })),
);

const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((module) => ({
    default: module.OnboardingPage,
  })),
);

const AuthPage = lazy(() =>
  import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })),
);
const AccountPage = lazy(() =>
  import("./pages/AccountPage").then((module) => ({
    default: module.AccountPage,
  })),
);
const PublicProfilePage = lazy(() =>
  import("./pages/PublicProfilePage").then((module) => ({ default: module.PublicProfilePage })),
);

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title =
      pathname === "/"
        ? "Pact — Your craft. Your people. Your pay."
        : `${pathname === "/signup" ? "Create your account" : pathname === "/onboarding" ? "Make it yours" : pathname === "/account" ? "Your account" : pathname === "/preview" ? "Your profile preview" : "Welcome back"} — Pact`;
  }, [pathname]);
  useEffect(() => {
    const appPaths = ["/", "/signup", "/login", "/account", "/preview", "/onboarding", "/auth", "/register"];
    if (!appPaths.includes(pathname)) document.title = `${pathname.slice(1)} — Pact`;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
        <RouteEffects />
        <Suspense
          fallback={<PactLoader message="Opening your next chapter…" />}
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/signup"
              element={<AuthPage key="signup" mode="signup" />}
            />
            <Route
              path="/login"
              element={<AuthPage key="login" mode="login" />}
            />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/:username" element={<PublicProfilePage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route
              path="/register"
              element={<Navigate to="/signup" replace />}
            />
            <Route
              path="*"
              element={
                <main className="not-found">
                  <h1>This page hasn’t been made yet.</h1>
                  <p>Every good thing starts somewhere.</p>
                  <a className="button button-primary" href="/">
                    Back to Pact
                  </a>
                </main>
              }
            />
          </Routes>
        </Suspense>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
