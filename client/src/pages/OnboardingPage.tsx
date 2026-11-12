import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  LoaderCircle,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Brand, TestnetBadge } from "../components/Brand";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  useAvatarUpload,
  useCreator,
  useProfileUpdate,
  type Creator,
} from "../lib/auth";
import { useSession } from "../lib/session";
import { apiError } from "../lib/api";
import { PactLoader } from "../components/Toast";
import { useToast } from "../components/toast-context";

const steps = ["Your name", "Your story", "Your portrait"];
const headings = [
  "What should we call you?",
  "Every creator has a story.",
  "Put a face to your craft.",
];

export function OnboardingPage() {
  const token = useSession();
  const creator = useCreator();
  if (!token) return <Navigate to="/login" replace state={{ expired: true }} />;
  return (
    <div className="setup-page">
      <header className="site-header container">
        <Brand />
        <TestnetBadge />
        <ThemeToggle />
      </header>
      <main className="setup-main">
        {creator.isPending ? (
          <PactLoader message="Loading your profile…" />
        ) : creator.isError ? (
          <div>
            <h1>Let’s try that again.</h1>
            <p role="alert">{apiError(creator.error)}</p>
            <button
              className="button button-primary"
              onClick={() => void creator.refetch()}
              disabled={creator.isFetching}
            >
              Reload profile
            </button>
          </div>
        ) : (
          <ProfileSteps key={creator.data.id} creator={creator.data} />
        )}
      </main>
    </div>
  );
}

function ProfileSteps({ creator }: { creator: Creator }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState(creator.display_name ?? "");
  const [bio, setBio] = useState(creator.bio ?? "");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const profileUpdate = useProfileUpdate();
  const avatarUpload = useAvatarUpload();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  function move(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setSaveError("");
  }
  async function save() {
    setSaving(true);
    setSaveError("");
    const toastId = toast.show("Saving your profile…", "loading");
    try {
      await profileUpdate.mutateAsync({
        display_name: name.trim(),
        bio: bio.trim(),
      });
      if (file) await avatarUpload.mutateAsync(file);
      toast.show(file ? "Profile saved and portrait uploaded." : "Profile saved.", "success", toastId);
      navigate("/account", { replace: true, state: { profileSaved: true } });
    } catch (error) {
      const message = apiError(error);
      setSaveError(message);
      toast.show(`Couldn’t save your profile. ${message}`, "error", toastId);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Link
        className="setup-back"
        to="/account"
        onClick={(event) => {
          if (saving) event.preventDefault();
        }}
        aria-disabled={saving}
      >
        <ArrowLeft size={16} /> Your account
      </Link>
      <motion.div
        className="setup-intro"
        initial={{ opacity: 0, y: reduced ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
      >
        <span className="section-kicker">A space that feels like you</span>
        <h1>
          Make yourself <em>at home.</em>
        </h1>
        <p>Three little steps. A whole lot of personality.</p>
      </motion.div>
      <ol className="setup-progress" aria-label="Profile setup progress">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            data-complete={index < step}
          >
            <motion.span
              animate={{ scale: step === index && !reduced ? 1.08 : 1 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.1 }}
            >
              {index < step ? <Check size={16} /> : index + 1}
            </motion.span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="setup-track" aria-hidden="true">
        <motion.div
          animate={{ scaleX: (step + 1) / steps.length }}
          initial={false}
          transition={{ duration: reduced ? 0 : 0.8, ease: "easeInOut" }}
        />
      </div>
      <form
        className="setup-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (saving || !name.trim() || fileError) return;
          if (step < 2) move(step + 1);
          else void save();
        }}
      >
        <fieldset disabled={saving}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.section
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 24 }),
                show: { opacity: 1, x: 0 },
                leave: (d: number) => ({
                  opacity: 0,
                  x: reduced ? 0 : -d * 16,
                }),
              }}
              initial="enter"
              animate="show"
              exit="leave"
              transition={{
                duration: reduced ? 0 : 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={(definition) => {
                if (definition === "show")
                  heading.current?.focus({ preventScroll: true });
              }}
            >
              <span className="setup-count">STEP 0{step + 1} / 03</span>
              <h2 ref={heading} tabIndex={-1}>
                {headings[step]}
              </h2>
              {step === 0 && (
                <>
                  <p>Your name, your studio, your creative alter ego.</p>
                  <label htmlFor="profile-name">Display name</label>
                  <Input
                    id="profile-name"
                    autoComplete="nickname"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={50}
                    placeholder="Your name or studio"
                    aria-describedby="name-help"
                  />
                  <small id="name-help">
                    Your handle stays @{creator.handle}. You can edit your name
                    anytime.
                  </small>
                </>
              )}
              {step === 1 && (
                <>
                  <p>Tell your future supporters what you love making.</p>
                  <label htmlFor="profile-bio">
                    Your bio <span>Optional</span>
                  </label>
                  <Textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={500}
                    rows={5}
                    placeholder="I make things that…"
                    aria-describedby="bio-help"
                  />
                  <small id="bio-help">
                    {bio.length} / 500 characters. Keep it as wonderfully you as
                    possible.
                  </small>
                </>
              )}
              {step === 2 && (
                <>
                  <p>A photo, a logo, or something unmistakably you.</p>
                  <div className="setup-preview">
                    <div className="setup-avatar">
                      {preview || creator.avatar_url ? (
                        <img
                          src={preview || creator.avatar_url}
                          alt="Your profile portrait"
                        />
                      ) : (
                        <Camera size={28} />
                      )}
                    </div>
                    <div>
                      <strong>{name.trim()}</strong>
                      <span>@{creator.handle}</span>
                    </div>
                  </div>
                  <label htmlFor="profile-avatar">
                    Profile image <span>Optional</span>
                  </label>
                  <Input
                    id="profile-avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-describedby="avatar-help"
                    aria-invalid={!!fileError}
                    onChange={(event) => {
                      const chosen = event.target.files?.[0];
                      if (!chosen) return;
                      if (
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          chosen.type,
                        ) ||
                        chosen.size > 2 * 1024 * 1024
                      ) {
                        setFileError(
                          "Choose a JPG, PNG, or WebP image under 2 MB.",
                        );
                        event.target.value = "";
                        return;
                      }
                      setFileError("");
                      setFile(chosen);
                      setPreview(URL.createObjectURL(chosen));
                    }}
                  />
                  <small id="avatar-help">JPG, PNG, or WebP. Up to 2 MB.</small>
                  {fileError && (
                    <p className="setup-error" role="alert">
                      {fileError}{" "}
                      <button type="button" onClick={() => setFileError("")}>
                        Dismiss
                      </button>
                    </p>
                  )}
                  {bio && <blockquote className="setup-bio">{bio}</blockquote>}
                  <small>
                    Finish to save your name and bio, then upload your selected
                    image.
                  </small>
                </>
              )}
            </motion.section>
          </AnimatePresence>
          <div className="setup-actions">
            {step > 0 ? (
              <button
                type="button"
                className="button button-outline"
                onClick={() => move(step - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="button button-primary"
              disabled={!name.trim() || !!fileError || saving}
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="spinner" />{" "}
                  {avatarUpload.isPending
                    ? "Uploading portrait…"
                    : "Saving profile…"}
                </>
              ) : step === 2 ? (
                <>
                  Finish profile <Check size={17} />
                </>
              ) : (
                <>
                  Continue <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </fieldset>
        {saveError && (
          <p className="setup-error" role="alert">
            {saveError} Your details are still here. Please try again.
          </p>
        )}
        <p className="setup-footnote" role="status">
          Step {step + 1} of 3 ·{" "}
          {step < 2 ? "Nothing saved until you finish." : "Ready when you are."}
        </p>
      </form>
      <p className="setup-disclaimer">
        Made for your next chapter. Testnet demo only.
      </p>
    </>
  );
}
