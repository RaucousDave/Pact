import { useId, useState } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { apiError } from "../lib/api";
import { uploadPageAsset } from "../lib/pages";
import { safeLink, socialPlatforms, type PageContent, type ProfileBlock } from "../lib/page-model";
import { useToast } from "./toast-context";
import axios from "axios";

export function AssetUpload({ label, onUpload, onBusy }: { label: string; onUpload: (url: string) => void; onBusy: (busy: boolean) => void }) {
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <label className="page-field">{label}
    <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setBusy(true); onBusy(true); setError("");
      const toastId = toast.show("Uploading image…", "loading");
      try { onUpload(await uploadPageAsset(file)); toast.show("Image uploaded and added to your draft.", "success", toastId); }
      catch (error) { const message = axios.isAxiosError(error) ? apiError(error) : error instanceof Error ? error.message : "Upload failed. Try again."; setError(message); toast.show(`Couldn’t upload image. ${message}`, "error", toastId); }
      finally { setBusy(false); onBusy(false); }
    }} />
    {busy && <small role="status">Uploading image…</small>}
    {error && <small role="alert">{error}</small>}
  </label>;
}

function Field({ label, value, onChange, max = 200, multiline = false, error }: { label: string; value: string; onChange: (value: string) => void; max?: number; multiline?: boolean; error?: string }) {
  const errorId = useId();
  return <label className="page-field">{label}{multiline
    ? <Textarea value={value} maxLength={max} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={(e) => onChange(e.target.value)} />
    : <Input value={value} maxLength={max} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={(e) => onChange(e.target.value)} />}{error && <small id={errorId} role="alert">{error}</small>}</label>;
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string }[] }) {
  const id = useId();
  return <div className="page-field"><label htmlFor={id}>{label}</label><Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

export function PageContentEditor({ content, onChange, onBusy, showValidation = false }: { content: PageContent; onChange: (content: PageContent) => void; onBusy: (busy: boolean) => void; showValidation?: boolean }) {
  function changeBlock(index: number, block: ProfileBlock) {
    onChange({ ...content, blocks: content.blocks.map((old, i) => i === index ? block : old) });
  }
  function move(index: number, offset: number) {
    const blocks = [...content.blocks];
    [blocks[index], blocks[index + offset]] = [blocks[index + offset], blocks[index]];
    onChange({ ...content, blocks });
  }
  function add(type: ProfileBlock["type"]) {
    const id = crypto.randomUUID();
    let block: ProfileBlock;
    switch (type) {
      case "link": block = { id, type, title: "", url: "" }; break;
      case "heading": case "text": block = { id, type, text: "" }; break;
      case "image": block = { id, type, imageUrl: "", alt: "" }; break;
      case "tip": block = { id, type, title: "Leave a little love", presetAmounts: ["1", "5", "10"], allowCustomAmount: true }; break;
      case "commission": block = { id, type, commissionId: "" }; break;
    }
    onChange({ ...content, blocks: [...content.blocks, block] });
  }
  return <div className="page-content-editor">
    <h3>Social links</h3>
    <p className="studio-help">Help people find you elsewhere.</p>
    {content.socialLinks.map((link, index) => <fieldset className="page-editor-card" key={link.id}>
      <legend>Social link {index + 1}</legend>
      <Choice label="Platform" value={link.platform} onChange={(value) => onChange({ ...content, socialLinks: content.socialLinks.map((old, i) => i === index ? { ...old, platform: value as typeof link.platform } : old) })} options={socialPlatforms.map((platform) => ({ value: platform, label: platform }))} />
      <Field label="URL" value={link.url} max={2048} error={showValidation && !safeLink(link.url) ? "Enter a full URL, for example https://instagram.com/yourname." : undefined} onChange={(url) => onChange({ ...content, socialLinks: content.socialLinks.map((old, i) => i === index ? { ...old, url } : old) })} />
      <Field label="Label (optional)" value={link.label || ""} max={40} onChange={(label) => onChange({ ...content, socialLinks: content.socialLinks.map((old, i) => i === index ? { ...old, label } : old) })} />
      <button type="button" onClick={() => onChange({ ...content, socialLinks: content.socialLinks.filter((_, i) => i !== index) })}>Remove social link</button>
    </fieldset>)}
    <button type="button" className="button button-outline" disabled={content.socialLinks.length >= 10} onClick={() => onChange({ ...content, socialLinks: [...content.socialLinks, { id: crypto.randomUUID(), platform: "website", url: "" }] })}>Add social link</button>
    <h3>Page content</h3>
    {!content.blocks.length && <p className="studio-help">Start with a link to your work, a short introduction, or an image.</p>}
    {content.blocks.map((block, index) => <fieldset className="page-editor-card" key={block.id}>
      <legend>{index + 1}. {block.type}</legend>
      <div className="page-block-actions">
        <button type="button" aria-label={`Move block ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
        <button type="button" aria-label={`Move block ${index + 1} down`} disabled={index === content.blocks.length - 1} onClick={() => move(index, 1)}>↓</button>
        <button type="button" onClick={() => onChange({ ...content, blocks: content.blocks.filter((_, i) => i !== index) })}>Remove</button>
        <label className="page-check-label"><Checkbox checked={block.visible !== false} onCheckedChange={(checked) => changeBlock(index, { ...block, visible: checked === true })} /> Visible</label>
      </div>
      {block.type === "link" && <>
        <Field label="Title" value={block.title} max={100} error={showValidation && !block.title.trim() ? "Enter a title for this link." : undefined} onChange={(title) => changeBlock(index, { ...block, title })} />
        <Field label="URL" value={block.url} max={2048} error={showValidation && !safeLink(block.url) ? "Enter a full URL, for example https://example.com/work." : undefined} onChange={(url) => changeBlock(index, { ...block, url })} />
        <Field label="Description" value={block.description || ""} onChange={(description) => changeBlock(index, { ...block, description })} />
        <AssetUpload label="Thumbnail (optional)" onBusy={onBusy} onUpload={(thumbnailUrl) => changeBlock(index, { ...block, thumbnailUrl })} />
        {block.thumbnailUrl && <button type="button" onClick={() => changeBlock(index, { ...block, thumbnailUrl: null })}>Remove thumbnail</button>}
      </>}
      {(block.type === "heading" || block.type === "text") && <Field label={block.type === "heading" ? "Heading" : "Text"} value={block.text} max={block.type === "heading" ? 100 : 1000} multiline={block.type === "text"} onChange={(text) => changeBlock(index, { ...block, text })} />}
      {block.type === "image" && <>
        <AssetUpload label={block.imageUrl ? "Replace image" : "Upload image"} onBusy={onBusy} onUpload={(imageUrl) => changeBlock(index, { ...block, imageUrl })} />
        <Field label="Image description (alt text)" value={block.alt} onChange={(alt) => changeBlock(index, { ...block, alt })} />
        <Field label="Caption" value={block.caption || ""} onChange={(caption) => changeBlock(index, { ...block, caption })} />
        <Field label="Link URL (optional)" value={block.linkUrl || ""} max={2048} onChange={(linkUrl) => changeBlock(index, { ...block, linkUrl: linkUrl || null })} />
      </>}
      {block.type === "tip" && <>
        <Field label="Title" value={block.title} max={100} onChange={(title) => changeBlock(index, { ...block, title })} />
        <Field label="Description" value={block.description || ""} onChange={(description) => changeBlock(index, { ...block, description })} />
        <Field label="Amounts (comma separated)" value={block.presetAmounts.join(",")} onChange={(value) => changeBlock(index, { ...block, presetAmounts: value ? value.split(",").map((part) => part.trim()) : [] })} />
        <label className="page-check-label"><Checkbox checked={block.allowCustomAmount} onCheckedChange={(checked) => changeBlock(index, { ...block, allowCustomAmount: checked === true })} /> Allow custom amount</label>
        <p className="studio-help">Display only. Payments are not available yet.</p>
      </>}
      {block.type === "commission" && <><Field label="Commission ID" value={block.commissionId} max={64} onChange={(commissionId) => changeBlock(index, { ...block, commissionId })} /><p className="studio-help">Saved for later. Commission details and booking are not available yet.</p></>}
      {(block.type === "link" || block.type === "tip") && <>
        <Choice label="Emphasis" value={block.appearance?.emphasis || "default"} onChange={(value) => changeBlock(index, { ...block, appearance: { ...block.appearance, emphasis: value as "default" | "featured" } })} options={[{ value: "default", label: "Default" }, { value: "featured", label: "Featured" }]} />
        <Choice label="Animation" value={block.appearance?.animation || "inherit"} onChange={(value) => changeBlock(index, { ...block, appearance: { ...block.appearance, animation: value as "inherit" | "none" | "lift" | "pulse" } })} options={[{ value: "inherit", label: "Use page setting" }, { value: "none", label: "Off" }, { value: "lift", label: "Lift" }, { value: "pulse", label: "Pulse" }]} />
      </>}
    </fieldset>)}
    <div className="page-add-blocks">{(["link", "heading", "text", "image", "tip", "commission"] as const).map((type) => <button type="button" key={type} disabled={content.blocks.length >= 50} onClick={() => add(type)}>+ {type}</button>)}</div>
  </div>;
}
