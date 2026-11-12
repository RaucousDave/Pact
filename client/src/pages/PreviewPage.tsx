import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PageContentEditor,
  AssetUpload,
} from "../components/PageContentEditor";
import { useMyPage } from "../lib/pages";
import { PactLoader } from "../components/Toast";
import { useToast } from "../components/toast-context";
import {
  fromApiTheme,
  toApiTheme,
  validateContent,
  type CreatorPage,
  type PageContent,
} from "../lib/page-model";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Check,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProfileCanvas } from "../components/ProfileCanvas";
import { useCreator, type Creator } from "../lib/auth";
import { useSession } from "../lib/session";
import { api, apiError } from "../lib/api";
import {
  contrastRatio,
  safeImageUrl,
  themePresets,
  type ProfileTheme,
} from "../lib/profile-theme";
import "../preview.css";
import { Slider } from "../components/ui/slider";
import { ColorPicker } from "../components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export function PreviewPage() {
  const token = useSession();
  const creator = useCreator();
  const page = useMyPage();
  const toast = useToast();
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="preview-page">
      <header className="site-header container">
        <Brand />
        <div className="theme-actions">
          <Link className="preview-account-link" to="/account">
            <ArrowLeft size={16} /> Account
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {creator.isPending || page.isPending ? (
        <PactLoader message="Loading your creative space…" />
      ) : creator.isError || page.isError ? (
        <main className="preview-loading">
          <h1>Couldn’t load your profile.</h1>
          <p role="alert">{apiError(creator.error || page.error)}</p>
          <button
            className="button button-primary"
            onClick={() => {
              const id = toast.show("Refreshing your profile…", "loading");
              void Promise.all([creator.refetch(), page.refetch()]).then(([creatorResult, pageResult]) => {
                const failed = creatorResult.isError || pageResult.isError;
                toast.show(failed ? "Couldn’t refresh your profile. Try again." : "Profile refreshed.", failed ? "error" : "success", id);
              });
            }}
            disabled={creator.isFetching || page.isFetching}
          >
            Try again
          </button>
        </main>
      ) : (
        <ThemeStudio
          key={creator.data.id}
          creator={creator.data}
          page={page.data}
        />
      )}
    </div>
  );
}

const colorLabels: { key: keyof ProfileTheme["colors"]; label: string }[] = [
  { key: "text", label: "Main text" },
  { key: "mutedText", label: "Secondary text" },
  { key: "accent", label: "Accent" },
  { key: "cardBackground", label: "Card background" },
  { key: "cardText", label: "Card text" },
  { key: "cardBorder", label: "Card border" },
];

function ThemeStudio({
  creator,
  page,
}: {
  creator: Creator;
  page: CreatorPage;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [initial] = useState(() => fromApiTheme(page.theme));
  const [theme, setTheme] = useState(initial);
  const [content, setContent] = useState<PageContent>(() => ({
    socialLinks: page.socialLinks,
    blocks: page.blocks,
  }));
  const [saved, setSaved] = useState(() =>
    JSON.stringify({
      theme: initial,
      content: { socialLinks: page.socialLinks, blocks: page.blocks },
    }),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [panel, setPanel] = useState<"presets" | "details" | "content">(
    "presets",
  );
  const reduced = useReducedMotion();
  const dirty = JSON.stringify({ theme, content }) !== saved;
  const imageInvalid =
    theme.background.imageUrl !== "" &&
    !safeImageUrl(theme.background.imageUrl);
  const imageMissing =
    theme.background.type === "image" && !theme.background.imageUrl;
  const saveDisabledReason = saving
    ? "A save request is in progress."
    : uploading
      ? "An image is still uploading."
      : imageInvalid
        ? "The background image URL is invalid."
        : imageMissing
          ? "Upload a background image first."
          : !dirty
            ? "No unsaved changes detected."
            : "";
  const lowContrast =
    contrastRatio(theme.colors.text, theme.background.color) < 4.5 ||
    contrastRatio(theme.colors.mutedText, theme.background.color) < 4.5 ||
    contrastRatio(
      theme.colors.cardText,
      theme.cardStyle === "outline"
        ? theme.background.color
        : theme.colors.cardBackground,
    ) < 4.5;
  function update(change: Partial<ProfileTheme>) {
    setTheme((previous) => ({ ...previous, ...change, presetId: "custom" }));
    setStatus("");
  }
  function background(change: Partial<ProfileTheme["background"]>) {
    update({ background: { ...theme.background, ...change } });
  }
  async function save() {
    setShowValidation(true);
    const error = validateContent(content);
    if (error) {
      setStatus(error);
      setPanel("content");
      return;
    }
    if (saveDisabledReason) {
      return;
    }
    setSaving(true);
    setStatus("Saving your page…");
    const toastId = toast.show("Saving your page…", "loading");
    try {
      await api.put("/users/me/page", {
        theme: toApiTheme(theme),
        ...content,
      });
      setSaved(JSON.stringify({ theme, content }));
      setStatus("Page saved. Your public profile is up to date.");
      toast.show("Page saved. Your public profile is up to date.", "success", toastId);
      void queryClient.invalidateQueries({ queryKey: ["creator-page"] });
      void queryClient.invalidateQueries({
        queryKey: ["public-profile", creator.handle],
      });
    } catch (error) {
      const message = apiError(error);
      setStatus(message);
      toast.show(`Couldn’t save your page. ${message}`, "error", toastId);
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="studio-shell">
      <div className="studio-heading">
        <div>
          <p className="studio-eyebrow">Your creator space</p>
          <h1>A page with your personality.</h1>
          <p>Try a new look. Make it your own.</p>
        </div>
        <div className="studio-save">
          <span>{dirty ? "Unsaved changes" : "Saved page"}</span>
          <button
            type="button"
            className="button button-primary"
            onClick={save}
            disabled={!!saveDisabledReason}
            aria-describedby="save-button-state"
          >
            <Save size={16} /> {saving ? "Saving…" : "Save page"}
          </button>
        </div>
      </div>
      <p id="save-button-state" className="studio-status">
        {saveDisabledReason || "Ready to save your changes."}
      </p>
      <p className="studio-status" role="status">
        {status || "Save your changes to update your public profile."}
      </p>
      <div className="studio-layout">
        <aside className="studio-controls" aria-label="Profile appearance">
          <fieldset
            className="studio-edit-fields"
            disabled={saving || uploading}
          >
            <div className="studio-panel-heading">
              <h2>Make it yours</h2>
              <Link to="/onboarding">Edit profile</Link>
            </div>
            <div className="studio-tabs" aria-label="Appearance sections">
              <button
                aria-pressed={panel === "presets"}
                onClick={() => setPanel("presets")}
              >
                Themes
              </button>
              <button
                aria-pressed={panel === "details"}
                onClick={() => setPanel("details")}
              >
                Customize
              </button>
              <button
                aria-pressed={panel === "content"}
                onClick={() => setPanel("content")}
              >
                Content
              </button>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={panel}
                initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.35 }}
              >
                {panel === "content" ? (
                  <PageContentEditor
                    content={content}
                    showValidation={showValidation}
                    onChange={(next) => {
                      setContent(next);
                      setStatus("");
                    }}
                    onBusy={setUploading}
                  />
                ) : panel === "presets" ? (
                  <>
                    <p className="studio-help">
                      A starting point, never a box. Every theme is yours to
                      change.
                    </p>
                    <div className="studio-presets">
                      {themePresets.map(
                        ({ name, description, theme: preset }) => (
                          <button
                            key={preset.presetId}
                            className="studio-preset"
                            aria-pressed={theme.presetId === preset.presetId}
                            onClick={() => {
                              setTheme(structuredClone(preset));
                              setStatus("");
                            }}
                          >
                            <span
                              className="studio-swatch"
                              style={{
                                background: preset.background.color,
                                color: preset.colors.text,
                              }}
                            >
                              <span
                                style={{ background: preset.colors.accent }}
                              />
                              <i
                                style={{
                                  background: preset.colors.cardBackground,
                                  borderColor: preset.colors.cardBorder,
                                }}
                              />
                              <i
                                style={{
                                  background: preset.colors.cardBackground,
                                  borderColor: preset.colors.cardBorder,
                                }}
                              />
                            </span>
                            <span>
                              <strong>{name}</strong>
                              <small>{description}</small>
                            </span>
                            {theme.presetId === preset.presetId && (
                              <Check size={17} />
                            )}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="studio-note">
                      <h3>Your work, front and center.</h3>
                      <p>
                        Your name, bio, and avatar come from your profile. Add
                        your links and images in the Content tab.
                      </p>
                    </div>
                    <button
                      className="button button-outline studio-customize"
                      onClick={() => setPanel("details")}
                    >
                      Customize this look
                    </button>
                  </>
                ) : (
                  <>
                    <fieldset className="studio-group">
                      <legend>Background</legend>
                      <label htmlFor="background-kind">Style</label>
                      <Select
                        value={theme.background.type}
                        onValueChange={(value) =>
                          background({
                            type: value as ProfileTheme["background"]["type"],
                            ...(value === "image"
                              ? {
                                  color: themePresets[0].theme.background.color,
                                }
                              : {}),
                          })
                        }
                      >
                        <SelectTrigger id="background-kind">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid color</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                      {theme.background.type !== "image" && (
                        <ColorPicker
                          label="Background color"
                          value={theme.background.color}
                          onChange={(color) => background({ color })}
                        />
                      )}
                      {theme.background.type === "gradient" && (
                        <>
                          <ColorPicker
                            label="Gradient end"
                            value={theme.background.to}
                            onChange={(to) => background({ to })}
                          />
                          <label htmlFor="gradient-angle">
                            Direction <span>{theme.background.angle}°</span>
                          </label>
                          <Slider
                            id="gradient-angle"
                            aria-label="Gradient direction"
                            aria-valuetext={`${theme.background.angle} degrees`}
                            min={0}
                            max={360}
                            step={1}
                            value={[theme.background.angle]}
                            onValueChange={([angle]) => background({ angle })}
                          />
                        </>
                      )}
                      {theme.background.type === "image" && (
                        <>
                          <AssetUpload
                            label={
                              theme.background.imageUrl
                                ? "Replace background image"
                                : "Upload background image"
                            }
                            onBusy={setUploading}
                            onUpload={(imageUrl) =>
                              background({
                                imageUrl,
                                color: themePresets[0].theme.background.color,
                              })
                            }
                          />
                          <small>JPG, PNG, WebP, or GIF, up to 5MB.</small>
                          <label htmlFor="overlay-opacity">
                            Overlay{" "}
                            <span>
                              {Math.round(
                                theme.background.overlayOpacity * 100,
                              )}
                              %
                            </span>
                          </label>
                          <Slider
                            id="overlay-opacity"
                            aria-label="Background overlay opacity"
                            aria-valuetext={`${Math.round(theme.background.overlayOpacity * 100)} percent`}
                            min={0}
                            max={1}
                            step={0.05}
                            value={[theme.background.overlayOpacity]}
                            onValueChange={([overlayOpacity]) =>
                              background({ overlayOpacity })
                            }
                          />
                        </>
                      )}
                    </fieldset>
                    <fieldset className="studio-group">
                      <legend>Colors</legend>
                      {colorLabels.map(({ key, label }) => (
                        <ColorPicker
                          key={key}
                          label={label}
                          value={theme.colors[key]}
                          onChange={(value) =>
                            update({
                              colors: { ...theme.colors, [key]: value },
                            })
                          }
                        />
                      ))}
                      {lowContrast && (
                        <p className="studio-contrast">
                          Some text may be hard to read. Try a stronger contrast
                          between text and background.
                        </p>
                      )}
                      {theme.background.type !== "solid" && (
                        <small>
                          Check readability across the whole background,
                          especially behind your bio.
                        </small>
                      )}
                    </fieldset>
                    <fieldset className="studio-group">
                      <legend>Type & cards</legend>
                      <label htmlFor="profile-font">Font</label>
                      <Select
                        value={theme.font}
                        onValueChange={(value) =>
                          update({
                            font: value as ProfileTheme["font"],
                          })
                        }
                      >
                        <SelectTrigger id="profile-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dm-sans">
                            DM Sans · Clean
                          </SelectItem>
                          <SelectItem value="manrope">
                            Manrope · Modern
                          </SelectItem>
                          <SelectItem value="instrument-serif">
                            Instrument Serif · Expressive
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <label htmlFor="card-style">Card style</label>
                      <Select
                        value={theme.cardStyle}
                        onValueChange={(value) =>
                          update({
                            cardStyle: value as ProfileTheme["cardStyle"],
                          })
                        }
                      >
                        <SelectTrigger id="card-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="filled">Filled</SelectItem>
                          <SelectItem value="outline">Outlined</SelectItem>
                          <SelectItem value="soft">Softly shaded</SelectItem>
                        </SelectContent>
                      </Select>
                      <label htmlFor="corner-style">Corners</label>
                      <Select
                        value={theme.cornerStyle}
                        onValueChange={(value) =>
                          update({
                            cornerStyle: value as ProfileTheme["cornerStyle"],
                          })
                        }
                      >
                        <SelectTrigger id="corner-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="pill">Pill</SelectItem>
                        </SelectContent>
                      </Select>
                      <label htmlFor="profile-spacing">Spacing</label>
                      <Select
                        value={theme.spacing}
                        onValueChange={(value) =>
                          update({
                            spacing: value as ProfileTheme["spacing"],
                          })
                        }
                      >
                        <SelectTrigger id="profile-spacing">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comfortable">
                            Comfortable
                          </SelectItem>
                          <SelectItem value="compact">Compact</SelectItem>
                        </SelectContent>
                      </Select>
                    </fieldset>
                    <fieldset className="studio-group">
                      <legend>Movement</legend>
                      <label htmlFor="profile-motion">Animation</label>
                      <Select
                        value={theme.motion}
                        onValueChange={(value) =>
                          update({
                            motion: value as ProfileTheme["motion"],
                          })
                        }
                      >
                        <SelectTrigger id="profile-motion">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Off</SelectItem>
                          <SelectItem value="gentle">Gentle</SelectItem>
                          <SelectItem value="expressive">Expressive</SelectItem>
                        </SelectContent>
                      </Select>
                      <small>
                        {reduced
                          ? "Your device prefers reduced motion. Profile animations are disabled."
                          : "Hover over preview cards to try it. Reduced-motion preferences always take priority."}
                      </small>
                    </fieldset>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            <button
              className="studio-reset"
              onClick={() => {
                const restored = JSON.parse(saved) as {
                  theme: ProfileTheme;
                  content: PageContent;
                };
                setTheme(restored.theme);
                setContent(restored.content);
                setStatus("Restored your last saved page.");
              }}
            >
              <RotateCcw size={14} /> Restore saved page
            </button>
          </fieldset>
        </aside>
        <section className="studio-stage" aria-label="Live preview">
          <div className="studio-stage-toolbar">
            <span>
              Live preview <i />
            </span>
            <div className="studio-device-controls">
              <button
                aria-label="Phone preview"
                aria-pressed={device === "phone"}
                onClick={() => setDevice("phone")}
              >
                <Smartphone size={17} />
              </button>
              <button
                aria-label="Desktop preview"
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Monitor size={18} />
              </button>
            </div>
          </div>
          <motion.div
            className="studio-device"
            data-device={device}
            layout
            transition={{
              duration: reduced ? 0 : 0.75,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="studio-device-address">
              <span />
              pact / {creator.handle}
              <span />
            </div>
            <ProfileCanvas
              identity={{
                handle: creator.handle,
                displayName: creator.display_name ?? creator.handle,
                bio: creator.bio ?? null,
                avatarUrl: creator.avatar_url ?? null,
              }}
              theme={theme}
              content={content}
            />
          </motion.div>
          <p className="studio-stage-note">
            Changes appear on your public profile after you save.
          </p>
        </section>
      </div>
    </main>
  );
}
