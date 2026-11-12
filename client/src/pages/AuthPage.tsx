import { Input } from "../components/ui/input";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Brand, TestnetBadge } from "../components/Brand";
import { CreatorPreview } from "../components/CreatorPreview";
import { ThemeToggle } from "../components/ThemeToggle";
import { isValidHandle, useAuth, useHandleAvailability } from "../lib/auth";
import { apiError } from "../lib/api";
import { useSession } from "../lib/session";
import { useToast } from "../components/toast-context";

type Fields = "display_name" | "handle" | "email" | "password";

export function AuthPage({ mode }: { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSession();
  const reducedMotion = useReducedMotion();
  const auth = useAuth(mode);
  const toast = useToast();
  const [values, setValues] = useState({
    display_name: "",
    handle: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [debouncedHandle, setDebouncedHandle] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedHandle(values.handle),
      450,
    );
    return () => window.clearTimeout(timeout);
  }, [values.handle]);
  const availability = useHandleAvailability(signup ? debouncedHandle : "");
  const handleFresh = debouncedHandle === values.handle;

  function update(field: Fields, value: string) {
    setValues((previous) => ({
      ...previous,
      [field]:
        field === "handle" ? value.toLowerCase().replace(/^@/, "") : value,
    }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    if (auth.isError) auth.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.isPending) return;
    const nextErrors: Partial<Record<Fields, string>> = {};
    if (signup && !values.display_name.trim())
      nextErrors.display_name = "Tell us what to call you.";
    if (signup && !isValidHandle(values.handle))
      nextErrors.handle =
        "Use 3–20 lowercase letters, numbers, or underscores. Reserved names aren’t available.";
    else if (signup && handleFresh && availability.data?.available === false)
      nextErrors.handle = "This handle is taken. Try another one.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (values.password.length < 8)
      nextErrors.password = "Use at least 8 characters.";
    else if (new TextEncoder().encode(values.password).length > 72)
      nextErrors.password =
        "This password is too long. Use fewer characters (maximum 72 bytes).";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    const credentials = {
      email: values.email.trim().toLowerCase(),
      password: values.password,
    };
    const toastId = toast.show(signup ? "Creating your account…" : "Signing you in…", "loading");
    auth.mutate(
      signup
        ? {
            ...credentials,
            display_name: values.display_name.trim(),
            handle: values.handle,
          }
        : credentials,
      {
        onSuccess: () => {
          toast.show(signup ? "Account created. Welcome to Pact!" : "You’re signed in.", "success", toastId);
          navigate("/account", { replace: true, state: { created: signup } });
        },
        onError: (error) => toast.show(apiError(error), "error", toastId),
      },
    );
  }

  if (token) return <Navigate to="/account" replace />;

  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand light />
        <div className="auth-story-heading">
          <span className="auth-story-label">A good place to begin.</span>
          <h2>
            Your talent.
            <br />A world of possibility.
          </h2>
          <p>
            A little support can make a big difference.
            <br />
            Let your next chapter start here.
          </p>
        </div>
        <CreatorPreview compact />
        <div className="auth-story-footer">
          <span className="nigeria-flag" aria-hidden="true" />
          Rooted in Nigeria. Open to the world.
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-topbar">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            <span>Back to Pact</span>
          </Link>
          <div className="theme-actions">
            <TestnetBadge />
            <ThemeToggle />
          </div>
        </div>
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <div className="form-intro">
            <span className="form-flower" aria-hidden="true">
              ✳
            </span>
            <h1>
              {signup ? "Make your first Pact." : "Good to have you back."}
            </h1>
            <p>
              {signup
                ? "For the work you love and the people who love it."
                : "Your next good thing starts right here."}
            </p>
          </div>
          <div className="auth-switch" aria-label="Authentication options">
            <Link to="/signup" aria-current={signup ? "page" : undefined}>
              Create account{signup && <motion.span layoutId="auth-tab" />}
            </Link>
            <Link to="/login" aria-current={!signup ? "page" : undefined}>
              Log in{!signup && <motion.span layoutId="auth-tab" />}
            </Link>
          </div>
          {location.state?.expired && (
            <p className="form-notice" role="status">
              Your session has ended. Log in to continue.
            </p>
          )}
          <form onSubmit={submit} noValidate>
            <fieldset disabled={auth.isPending}>
              {signup && (
                <>
                  <div className="form-field">
                    <label htmlFor="display_name">Display name</label>
                    <Input
                      id="display_name"
                      autoComplete="name"
                      placeholder="What should we call you?"
                      value={values.display_name}
                      onChange={(event) =>
                        update("display_name", event.target.value)
                      }
                      aria-invalid={!!errors.display_name}
                      aria-describedby={
                        errors.display_name ? "display_name-error" : undefined
                      }
                      maxLength={100}
                      required
                    />
                    {errors.display_name && (
                      <p className="field-error" id="display_name-error">
                        {errors.display_name}
                      </p>
                    )}
                  </div>
                  <div className="form-field">
                    <label htmlFor="handle">Your handle</label>
                    <div
                      className={`input-with-prefix${errors.handle ? " input-invalid" : ""}`}
                    >
                      <span>pact /</span>
                      <Input
                        id="handle"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="yourname"
                        value={values.handle}
                        onChange={(event) =>
                          update("handle", event.target.value)
                        }
                        maxLength={20}
                        aria-invalid={!!errors.handle}
                        aria-describedby="handle-help"
                        required
                      />
                      {handleFresh && availability.data?.available && (
                        <Check
                          size={17}
                          className="handle-check"
                          aria-label="Handle available"
                        />
                      )}
                    </div>
                    <p
                      id="handle-help"
                      className={
                        errors.handle ||
                        (handleFresh && availability.data?.available === false)
                          ? "field-error"
                          : "field-help"
                      }
                      aria-live="polite"
                    >
                      {errors.handle ||
                        (handleFresh && availability.isFetching
                          ? "Checking your handle…"
                          : handleFresh &&
                              availability.data?.available === false
                            ? "This handle is taken. Try another one."
                            : handleFresh && availability.data?.available
                              ? "It’s yours for the taking."
                              : availability.isError
                                ? "Availability check unavailable. We’ll check again when you sign up."
                                : "Your little corner of the internet. 3–20 characters.")}
                    </p>
                  </div>
                </>
              )}
              <div className="form-field">
                <label htmlFor="email">Email address</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={(event) => update("email", event.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                />
                {errors.email && (
                  <p className="field-error" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <div
                  className={`password-input${errors.password ? " input-invalid" : ""}`}
                >
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    placeholder={
                      signup ? "At least 8 characters" : "Enter your password"
                    }
                    value={values.password}
                    onChange={(event) => update("password", event.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password
                        ? "password-error"
                        : signup
                          ? "password-help"
                          : undefined
                    }
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" className="field-error">
                    {errors.password}
                  </p>
                ) : (
                  signup && (
                    <p className="field-help" id="password-help">
                      Make it unique. Make it yours.
                    </p>
                  )
                )}
              </div>
              <AnimatePresence>
                {auth.isError && (
                  <motion.div
                    role="alert"
                    className="form-error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <strong>
                      {signup
                        ? "Your account wasn’t created."
                        : "We couldn’t log you in."}
                    </strong>
                    <p>{apiError(auth.error)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                className="button button-primary auth-submit"
                type="submit"
                disabled={auth.isPending}
              >
                {auth.isPending ? (
                  <>
                    <LoaderCircle className="spinner" size={18} />
                    {signup ? "Setting up your account…" : "Logging you in…"}
                  </>
                ) : (
                  <>
                    {signup ? "Create my account" : "Log in to Pact"}
                    <ArrowUpRight size={18} />
                  </>
                )}
              </button>
            </fieldset>
            <p className="auth-pending-note" role="status">
              {auth.isPending && signup
                ? "We’re creating and funding your testnet wallet. This can take up to two minutes. Keep this page open."
                : ""}
            </p>
          </form>
          <div className="auth-assurance">
            <LockKeyhole size={15} />
            <p>
              {signup
                ? "No wallet extension. No seed phrase. Just you."
                : "Your account, safely in your corner."}
            </p>
          </div>
          <p className="auth-demo-note">
            This is a Stellar testnet demo. Wallets are app-managed and demo
            assets have no real value.
          </p>
          <p className="auth-bottom-link">
            {signup ? "Already part of Pact?" : "New around here?"}{" "}
            <Link to={signup ? "/login" : "/signup"}>
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </motion.div>
        <footer className="auth-footer">
          <span>Made for the beautifully independent.</span>
          <span>
            Powered by Stellar <span aria-hidden="true">◉</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
