import assert from "node:assert/strict";
import { test } from "node:test";
import { fromApiTheme, toApiTheme, safeLink, validateContent } from "../src/lib/page-model.ts";
import { themePresets } from "../src/lib/profile-theme.ts";

test("round-trip backend backgrounds without sending forbidden extra fields", () => {
  for (const background of [
    { type: "solid", color: "#123456" },
    { type: "gradient", from: "#123456", to: "#abcdef", angle: 123 },
    { type: "image", imageUrl: "https://storage.example/page-assets/image.png", overlayOpacity: 0.6 },
  ]) {
    const wire = { ...themePresets[0].theme, background };
    assert.deepEqual(toApiTheme(fromApiTheme(wire)), wire);
  }
});

test("validate hidden blocks too since the API persists them", () => {
  const content = { socialLinks: [], blocks: [{ id: "1", type: "link", title: "Work", url: "javascript:alert(1)", visible: false }] };
  assert.ok(validateContent(content));
  content.blocks[0].url = "https://example.com/work";
  assert.equal(validateContent(content), undefined);
  assert.equal(content.blocks[0].visible, false);
});

test("save validation identifies the exact link block and incomplete field", () => {
  const content = { socialLinks: [], blocks: [
    { id: "intro", type: "heading", text: "My work" },
    { id: "work", type: "link", title: "", url: "" },
  ] };
  assert.equal(validateContent(content), "Block 2 (link): enter a title.");
  content.blocks[1].title = "My work";
  assert.equal(validateContent(content), "Block 2 (link): enter a full http:// or https:// URL.");
  content.blocks[1].url = "https://example.com/work";
  assert.equal(validateContent(content), undefined);
});

test("outgoing links reject executable and relative URLs", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,hello", "/account", "not a URL"]) assert.equal(safeLink(value), undefined);
  assert.equal(safeLink("https://example.com/work"), "https://example.com/work");
});

test("invalid tip amounts and missing images prevent saving", () => {
  const content = { socialLinks: [], blocks: [{ id: "1", type: "tip", title: "Support", presetAmounts: ["1", "1e9"], allowCustomAmount: true }] };
  assert.ok(validateContent(content));
  content.blocks[0].presetAmounts = ["0.0000001", "999999999"];
  assert.equal(validateContent(content), undefined);
  assert.ok(validateContent({ socialLinks: [], blocks: [{ id: "2", type: "image", imageUrl: "", alt: "Art" }] }));
});
