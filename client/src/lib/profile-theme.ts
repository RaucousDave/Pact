export interface ProfileTheme {
  presetId: string;
  background: {
    type: "solid" | "gradient" | "image";
    color: string;
    to: string;
    angle: number;
    imageUrl: string;
    overlayOpacity: number;
  };
  colors: {
    text: string;
    mutedText: string;
    accent: string;
    cardBackground: string;
    cardText: string;
    cardBorder: string;
  };
  font: "dm-sans" | "manrope" | "instrument-serif";
  cardStyle: "filled" | "outline" | "soft";
  cornerStyle: "square" | "rounded" | "pill";
  spacing: "compact" | "comfortable";
  motion: "none" | "gentle" | "expressive";
}

export interface PublicIdentity {
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

export const themePresets: {
  name: string;
  description: string;
  theme: ProfileTheme;
}[] = [
  {
    name: "Pact studio",
    description: "Warm paper. A spark of orange.",
    theme: {
      presetId: "studio",
      background: {
        type: "solid",
        color: "#f8f7f2",
        to: "#e6eddf",
        angle: 145,
        imageUrl: "",
        overlayOpacity: 0.35,
      },
      colors: {
        text: "#292c25",
        mutedText: "#66685e",
        accent: "#ff754a",
        cardBackground: "#fffefa",
        cardText: "#292c25",
        cardBorder: "#d6d8cd",
      },
      font: "dm-sans",
      cardStyle: "filled",
      cornerStyle: "rounded",
      spacing: "comfortable",
      motion: "gentle",
    },
  },
  {
    name: "After hours",
    description: "Deep ink. Electric lilac.",
    theme: {
      presetId: "night",
      background: {
        type: "gradient",
        color: "#242037",
        to: "#10151f",
        angle: 160,
        imageUrl: "",
        overlayOpacity: 0.45,
      },
      colors: {
        text: "#f5f0ff",
        mutedText: "#c1b9d3",
        accent: "#c2a4ff",
        cardBackground: "#342d48",
        cardText: "#f5f0ff",
        cardBorder: "#706384",
      },
      font: "manrope",
      cardStyle: "outline",
      cornerStyle: "rounded",
      spacing: "comfortable",
      motion: "gentle",
    },
  },
  {
    name: "Garden notes",
    description: "Fresh green. A softer pace.",
    theme: {
      presetId: "garden",
      background: {
        type: "gradient",
        color: "#e4efc9",
        to: "#faf4de",
        angle: 135,
        imageUrl: "",
        overlayOpacity: 0.25,
      },
      colors: {
        text: "#243c30",
        mutedText: "#4f6555",
        accent: "#cce87c",
        cardBackground: "#f9fce9",
        cardText: "#243c30",
        cardBorder: "#a8bd94",
      },
      font: "instrument-serif",
      cardStyle: "soft",
      cornerStyle: "pill",
      spacing: "comfortable",
      motion: "gentle",
    },
  },
];

export function safeImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function isProfileTheme(value: unknown): value is ProfileTheme {
  if (!value || typeof value !== "object") return false;
  const t = value as Partial<ProfileTheme>;
  const b = t.background;
  const colors = t.colors;
  const hex = (v: unknown) =>
    typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  return (
    typeof t.presetId === "string" &&
    !!b &&
    !!colors &&
    ["solid", "gradient", "image"].includes(b.type) &&
    hex(b.color) &&
    hex(b.to) &&
    Number.isFinite(b.angle) &&
    b.angle >= 0 &&
    b.angle <= 360 &&
    typeof b.imageUrl === "string" &&
    (b.imageUrl === "" || !!safeImageUrl(b.imageUrl)) &&
    Number.isFinite(b.overlayOpacity) &&
    b.overlayOpacity >= 0 &&
    b.overlayOpacity <= 1 &&
    [
      colors.text,
      colors.mutedText,
      colors.accent,
      colors.cardBackground,
      colors.cardText,
      colors.cardBorder,
    ].every(hex) &&
    ["dm-sans", "manrope", "instrument-serif"].includes(t.font ?? "") &&
    ["filled", "outline", "soft"].includes(t.cardStyle ?? "") &&
    ["square", "rounded", "pill"].includes(t.cornerStyle ?? "") &&
    ["compact", "comfortable"].includes(t.spacing ?? "") &&
    ["none", "gentle", "expressive"].includes(t.motion ?? "")
  );
}

export function readThemeDraft(creatorId: number): ProfileTheme {
  try {
    const draft: unknown = JSON.parse(
      localStorage.getItem(`pact.theme.v1.${creatorId}`) ?? "null",
    );
    if (isProfileTheme(draft)) return draft;
  } catch {
    /* A missing or invalid browser draft uses the starter theme. */
  }
  return structuredClone(themePresets[0].theme);
}

export function contrastRatio(first: string, second: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => {
      const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
