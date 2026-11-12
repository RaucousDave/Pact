import type { CSSProperties } from "react";
// import { DonationCard } from "./DonationCard";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Heart, Globe } from "lucide-react";
import { SiInstagram as Instagram, SiYoutube as Youtube } from "react-icons/si";
import { TipCard } from "./TipCard";
import { safeLink, type PageContent, type ProfileBlock } from "../lib/page-model";
import {
  contrastRatio,
  safeImageUrl,
  type ProfileTheme,
  type PublicIdentity,
} from "../lib/profile-theme";

const fonts = {
  "dm-sans": '"DM Sans", sans-serif',
  manrope: '"Manrope", sans-serif',
  "instrument-serif": '"Instrument Serif", serif',
};

/** Shared display surface: only public identity is accepted, never account credentials. */
export function ProfileCanvas({
  identity,
  theme,
  preview = true,
  content,
}: {
  identity: PublicIdentity;
  theme: ProfileTheme;
  preview?: boolean;
  content?: PageContent;
}) {
  const reduced = useReducedMotion();
  const animate = !reduced && theme.motion !== "none";
  const imageUrl = safeImageUrl(theme.background.imageUrl);
  const background =
    theme.background.type === "gradient"
      ? `linear-gradient(${theme.background.angle}deg, ${theme.background.color}, ${theme.background.to})`
      : theme.background.color;
  const accentText =
    contrastRatio(theme.colors.accent, "#292c25") >=
    contrastRatio(theme.colors.accent, "#ffffff")
      ? "#292c25"
      : "#ffffff";
  const style = {
    "--profile-text": theme.colors.text,
    "--profile-muted": theme.colors.mutedText,
    "--profile-accent": theme.colors.accent,
    "--profile-accent-text": accentText,
    "--profile-card": theme.colors.cardBackground,
    "--profile-card-text": theme.colors.cardText,
    "--profile-border": theme.colors.cardBorder,
    "--profile-radius":
      theme.cornerStyle === "square"
        ? "0px"
        : theme.cornerStyle === "pill"
          ? "32px"
          : "14px",
    "--profile-gap": theme.spacing === "compact" ? "10px" : "18px",
    background,
    fontFamily: fonts[theme.font],
  } as CSSProperties;
  return (
    <article
      className="profile-canvas"
      style={style}
      data-card-style={theme.cardStyle}
      aria-label={preview ? "Your profile preview" : `${identity.displayName || identity.handle}'s profile`}
    >
      {theme.background.type === "image" && imageUrl && (
        <>
          <img
            key={imageUrl}
            className="profile-background"
            src={imageUrl}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div
            className="profile-overlay"
            style={{
              backgroundColor: theme.background.color,
              opacity: theme.background.overlayOpacity,
            }}
          />
        </>
      )}
      <div className="profile-canvas-content">
        <div className="profile-identity">
          <div className="profile-portrait">
            <span>
              {(identity.displayName || identity.handle)
                .slice(0, 1)
                .toUpperCase()}
            </span>
            {identity.avatarUrl && (
              <img
                key={identity.avatarUrl}
                src={identity.avatarUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          {preview ? <h2>{identity.displayName || identity.handle}</h2> : <h1>{identity.displayName || identity.handle}</h1>}
          <p className="profile-handle">@{identity.handle}</p>
          <p className="profile-description">
            {identity.bio ||
              (preview ? "Your story belongs here. Add a bio in profile setup." : "")}
          </p>
          {content && <div className="profile-socials profile-real-socials" aria-label="Social links">{content.socialLinks.map((link) => safeLink(link.url) && <a key={link.id} href={safeLink(link.url)} target="_blank" rel="noopener noreferrer">{link.label || link.platform}</a>)}</div>}
          {preview && !content && <div className="profile-socials" aria-label="Sample social icons">
            <span title="Sample Instagram icon">
              <Instagram size={19} />
            </span>
            <span title="Sample YouTube icon">
              <Youtube size={20} />
            </span>
            <span title="Sample website icon">
              <Globe size={19} />
            </span>
          </div>}
        </div>
        {content && <div className="profile-blocks">{content.blocks.filter((block) => block.visible !== false).map((block) => <SavedBlock key={block.id} block={block} animate={animate} handle={identity.handle} />)}</div>}
        {preview && !content && <div className="profile-blocks">
          {["Explore my work", "A little behind the scenes"].map((title) => (
            <motion.div
              key={title}
              className="profile-link-card"
              whileHover={
                animate
                  ? { y: theme.motion === "expressive" ? -5 : -2 }
                  : undefined
              }
              transition={{ duration: 0.45 }}
            >
              <div>
                <strong>{title}</strong>
                <span>Sample link</span>
              </div>
              <ArrowUpRight size={20} />
            </motion.div>
          ))}
          <motion.div
            className="profile-tip-card"
            whileHover={
              animate
                ? { scale: theme.motion === "expressive" ? 1.025 : 1.01 }
                : undefined
            }
            transition={{ type: "spring", duration: 0.85, bounce: 0.12 }}
          >
            <Heart size={25} />
            <h3>Leave a little love.</h3>
            <p>Make room for more of what I make.</p>
            <div className="profile-tip-amounts">
              <span>1 USDC</span>
              <span>5 USDC</span>
              <span>10 USDC</span>
            </div>
            <span className="profile-tip-label">
              Tip card preview · Payments aren’t enabled
            </span>
          </motion.div>
        </div>}
        <p className="profile-signature">
          Made with <strong>pact.</strong>
        </p>
      </div>
    </article>
  );
}

function SavedBlock({ block, animate, handle }: { block: ProfileBlock; animate: boolean; handle: string }) {
  const animation = block.appearance?.animation;
  const moves = animate && animation !== "none";
  const style = {
    whileHover: moves ? animation === "pulse" ? { scale: 1.02 } : { y: -3 } : undefined,
    "data-featured": block.appearance?.emphasis === "featured",
  };
  switch (block.type) {
    case "link": return <motion.a {...style} className="profile-link-card" href={safeLink(block.url)} target="_blank" rel="noopener noreferrer">
      {block.thumbnailUrl && safeImageUrl(block.thumbnailUrl) && <img className="profile-link-thumbnail" src={block.thumbnailUrl} alt="" />}
      <div><strong>{block.title}</strong>{block.description && <span>{block.description}</span>}</div><ArrowUpRight size={20} />
    </motion.a>;
    case "heading": return <h3 className="profile-content-heading">{block.text}</h3>;
    case "text": return <p className="profile-content-text">{block.text}</p>;
    case "image": {
      const image = safeImageUrl(block.imageUrl);
      if (!image) return null;
      return <figure className="profile-content-image">{block.linkUrl && safeLink(block.linkUrl)
        ? <a href={safeLink(block.linkUrl)} target="_blank" rel="noopener noreferrer"><img src={image} alt={block.alt} /></a>
        : <img src={image} alt={block.alt} />}{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    }
    case "tip": return <div className="profile-tip-card" data-featured={style["data-featured"]}><TipCard handle={handle} title={block.title} description={block.description} presetAmounts={block.presetAmounts} /></div>;
    case "commission": return <div className="profile-link-card"><div><strong>Commissions</strong><span>Booking is not available yet.</span></div></div>;
  }
}
