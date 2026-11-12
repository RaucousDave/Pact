import { themePresets, type ProfileTheme, type PublicIdentity } from "./profile-theme.ts";

export type ApiBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle: number }
  | { type: "image"; imageUrl: string; overlayOpacity: number };
export type ApiTheme = Omit<ProfileTheme, "background"> & { background: ApiBackground };
export const socialPlatforms = ["instagram", "tiktok", "youtube", "x", "linkedin", "github", "website"] as const;
export interface SocialLink {
  id: string;
  platform: typeof socialPlatforms[number];
  url: string;
  label?: string | null;
}
type BaseBlock = {
  id: string;
  visible?: boolean;
  appearance?: { emphasis?: "default" | "featured" | null; animation?: "inherit" | "none" | "lift" | "pulse" | null } | null;
};
export type ProfileBlock = BaseBlock & (
  | { type: "link"; title: string; url: string; description?: string | null; thumbnailUrl?: string | null }
  | { type: "heading" | "text"; text: string }
  | { type: "image"; imageUrl: string; alt: string; caption?: string | null; linkUrl?: string | null }
  | { type: "tip"; title: string; description?: string | null; presetAmounts: string[]; allowCustomAmount: boolean }
  | { type: "commission"; commissionId: string }
);
export interface PageContent { socialLinks: SocialLink[]; blocks: ProfileBlock[] }
export interface CreatorPage extends PageContent {
  id: string;
  creator: PublicIdentity;
  theme: ApiTheme;
}

export function fromApiTheme(theme: ApiTheme): ProfileTheme {
  const background = { ...themePresets[0].theme.background, type: theme.background.type };
  if (theme.background.type === "solid") background.color = theme.background.color;
  if (theme.background.type === "gradient") Object.assign(background, { color: theme.background.from, to: theme.background.to, angle: theme.background.angle });
  if (theme.background.type === "image") Object.assign(background, { imageUrl: theme.background.imageUrl, overlayOpacity: theme.background.overlayOpacity });
  return { ...theme, background };
}

export function toApiTheme(theme: ProfileTheme): ApiTheme {
  const b = theme.background;
  const background: ApiBackground = b.type === "solid"
    ? { type: "solid", color: b.color }
    : b.type === "gradient"
      ? { type: "gradient", from: b.color, to: b.to, angle: b.angle }
      : { type: "image", imageUrl: b.imageUrl, overlayOpacity: b.overlayOpacity };
  return { ...theme, background };
}

export function safeLink(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol)) return url.href;
  } catch { /* Invalid or incomplete URLs are not clickable. */ }
}

export function validateContent(content: PageContent): string | undefined {
  if (content.socialLinks.length > 10 || content.blocks.length > 50) return "Use at most 10 social links and 50 blocks.";
  const invalidSocial = content.socialLinks.findIndex((link) => !safeLink(link.url));
  if (invalidSocial !== -1) return `Social link ${invalidSocial + 1}: enter a full http:// or https:// URL.`;
  for (const [index, block] of content.blocks.entries()) {
    if (block.type === "link" && !block.title.trim()) return `Block ${index + 1} (link): enter a title.`;
    if (block.type === "link" && !safeLink(block.url)) return `Block ${index + 1} (link): enter a full http:// or https:// URL.`;
    if (block.type === "image" && (!block.imageUrl || (block.linkUrl && !safeLink(block.linkUrl)))) return "Upload each image and check its optional link URL.";
    if (block.type === "tip" && (block.presetAmounts.length > 6 || block.presetAmounts.some((amount) => !/^\d{1,9}(\.\d{1,7})?$/.test(amount)))) return "Use up to 6 tip amounts, each with at most 9 whole digits and 7 decimal places.";
    if (block.type === "commission" && !block.commissionId.trim()) return "Enter a commission ID or remove the commission block.";
  }
}
