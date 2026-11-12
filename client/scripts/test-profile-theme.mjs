import assert from "node:assert/strict";
import { test } from "node:test";
import {
  themePresets,
  isProfileTheme,
  safeImageUrl,
  contrastRatio,
  readThemeDraft,
} from "../src/lib/profile-theme.ts";

test("presets survive serialization and malformed drafts are rejected", () => {
  for (const preset of themePresets)
    assert.ok(isProfileTheme(JSON.parse(JSON.stringify(preset.theme))));
  for (const draft of [
    null,
    {},
    { ...themePresets[0].theme, colors: { text: "bad" } },
    { ...themePresets[0].theme, motion: "unknown" },
  ]) {
    assert.equal(isProfileTheme(draft), false);
  }
  assert.equal(
    isProfileTheme({
      ...themePresets[0].theme,
      background: { ...themePresets[0].theme.background, overlayOpacity: 5 },
    }),
    false,
  );
});

test("image URLs require HTTPS and contrast calculation uses luminance", () => {
  assert.equal(safeImageUrl("javascript:alert(1)"), undefined);
  assert.equal(safeImageUrl("http://example.com/image.jpg"), undefined);
  assert.equal(
    safeImageUrl("https://example.com/image.jpg"),
    "https://example.com/image.jpg",
  );
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
});

test("drafts are isolated per creator and corrupt or blocked storage falls back safely", () => {
  const storage = new Map([
    ["pact.theme.v1.1", JSON.stringify(themePresets[1].theme)],
    ["pact.theme.v1.2", "{broken"],
  ]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key) => storage.get(key) ?? null },
  });
  assert.equal(readThemeDraft(1).presetId, "night");
  assert.equal(readThemeDraft(2).presetId, "studio");
  assert.equal(readThemeDraft(3).presetId, "studio");
  const fallback = readThemeDraft(3);
  fallback.colors.text = "#000000";
  assert.notEqual(themePresets[0].theme.colors.text, "#000000");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Blocked");
    },
  });
  assert.equal(readThemeDraft(1).presetId, "studio");
  delete globalThis.localStorage;
});
