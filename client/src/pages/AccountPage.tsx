import { Input } from "../components/ui/input";
import { ReceivedDonations } from "../components/ReceivedDonations";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Brand, TestnetBadge } from "../components/Brand";
import { ThemeToggle } from "../components/ThemeToggle";
import { useCreator } from "../lib/auth";
import { PactLoader } from "../components/Toast";
import { useToast } from "../components/toast-context";
import { apiError } from "../lib/api";
import { session, useSession } from "../lib/session";
import "../public-profile.css";

export function AccountPage() {
  const token = useSession();
  const creator = useCreator();
  const toast = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [created] = useState(() => location.state?.created === true);
  const completed = location.state?.profileSaved === true;
  useEffect(() => {
    if (location.state?.created === true) {
      // Keep the welcome for this visit, but consume it from browser history.
      void navigate(location.pathname, {
        replace: true,
        state: { ...location.state, created: false },
      });
    }
  }, [location.pathname, location.state, navigate]);
  if (!token) return <Navigate to="/login" replace state={{ expired: true }} />;
  return (
    <div className="account-page">
      <header className="site-header container">
        <Brand />
        <TestnetBadge />
        <div className="theme-actions">
          <ThemeToggle />
          <button
            className="button button-outline button-small"
            onClick={() => {
              session.set(null);
              queryClient.clear();
            }}
          >
            Log out <LogOut size={15} />
          </button>
        </div>
      </header>
      <main className="account-main">
        {creator.isPending ? (
          <PactLoader message="Getting your account…" />
        ) : creator.isError ? (
          <>
            <h1>We couldn’t load your account.</h1>
            <p role="alert">{apiError(creator.error)}</p>
            <button
              className="button button-primary"
              onClick={() => {
                const id = toast.show("Refreshing your account…", "loading");
                void creator
                  .refetch()
                  .then((result) =>
                    toast.show(
                      result.isError
                        ? "Could not refresh your account. Try again."
                        : "Account refreshed.",
                      result.isError ? "error" : "success",
                      id,
                    ),
                  );
              }}
              disabled={creator.isFetching}
            >
              Try again
            </button>
          </>
        ) : (
          <motion.div
            className="account-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85 }}
          >
            {created && (
              <motion.span
                className="account-check"
                initial={{ scale: 0.7, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 1.1, bounce: 0.2 }}
              >
                <Check size={28} />
              </motion.span>
            )}
            <span className="section-kicker">
              {created ? "Your first Pact, made." : "Your account"}
            </span>
            <h1>
              {created ? (
                <>
                  You’re in,
                  <br />@{creator.data.handle}.
                </>
              ) : (
                "Profile dashboard"
              )}
            </h1>
            <p>
              {created
                ? "Your account is ready. Next, give your creator profile a name, a story, and a face."
                : "Manage your profile details and customize your creator page."}
            </p>
            {completed && <p role="status">Your profile details are saved.</p>}
            <div className="account-details">
              <div>
                <span>Your handle</span>
                <strong>@{creator.data.handle}</strong>
              </div>
              <div>
                <span>Your email</span>
                <strong>{creator.data.email}</strong>
              </div>
            </div>
            <Link to="/onboarding" className="button button-primary">
              {created ? "Make it yours" : "Edit profile"}{" "}
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/preview" className="account-preview-link">
              Preview & customize your page <ArrowUpRight size={16} />
            </Link>
            <ProfileShare
              key={creator.data.handle}
              handle={creator.data.handle}
            />
            <ReceivedDonations accountId={creator.data.id} />
            {created && (
              <div className="account-roadmap">
                <h2>A beginning worth celebrating.</h2>
                <p>
                  Your profile link is ready to share. Add a tip card to receive
                  testnet donations.
                </p>
              </div>
            )}
            <Link to="/" className="text-link">
              Back to Pact <ArrowUpRight size={16} />
            </Link>
          </motion.div>
        )}
        <p className="account-note">
          Testnet only. Demo assets have no real value.
        </p>
      </main>
    </div>
  );
}

function ProfileShare({ handle }: { handle: string }) {
  const [status, setStatus] = useState("");
  const toast = useToast();
  const path = `/${encodeURIComponent(handle)}`;
  const url = new URL(path, window.location.origin).href;
  async function copyLink() {
    const toastId = toast.show("Copying your profile link…", "loading");
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied. Paste it into your social bio.");
      toast.show(
        "Profile link copied. It’s ready to share.",
        "success",
        toastId,
      );
    } catch {
      setStatus("Select the link above and copy it to share.");
      toast.show(
        "Couldn’t copy the link automatically. Select it and copy it.",
        "error",
        toastId,
      );
    }
  }
  return (
    <section className="account-share" aria-label="Share your profile">
      <label htmlFor="profile-link">Your public profile link</label>
      <Input
        id="profile-link"
        value={url}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="account-share-actions">
        <button
          className="button button-outline"
          onClick={() => void copyLink()}
        >
          Copy link
        </button>
        <Link
          to={path}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          View public profile <ArrowUpRight size={16} />
        </Link>
      </div>
      <p role="status">{status}</p>
    </section>
  );
}