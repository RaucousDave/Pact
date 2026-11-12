import { useEffect, useId, useRef, useState } from "react";
import { Heart, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "./toast-context";
import type { ProfileBlock } from "../lib/page-model";
import { validDonationAmount, type PrepareDonation } from "../lib/donation-contract";
import { connectDonationWallet, donationError, prepareDonation, signDonation, submitDonation, transactionLink } from "../lib/donations";
import "../donations.css";

type Review = Awaited<ReturnType<typeof prepareDonation>> & { input: PrepareDonation };
type Receipt = { hash: string; id: string; accepted: boolean };
type WalletStep = "choice" | "varial" | null;

function readReceipt(key: string): Receipt | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return value && /^[a-f0-9]{64}$/i.test(value.hash) && typeof value.id === "string" ? value : null;
  } catch { return null; }
}

export function DonationCard({ handle, block }: { handle: string; block: Extract<ProfileBlock, { type: "tip" }> }) {
  const id = useId();
  const toast = useToast();
  const presets = block.presetAmounts.filter(validDonationAmount);
  const [amount, setAmount] = useState(presets[0] || "");
  const [customAmount, setCustomAmount] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const storageKey = `pact-donation:${handle}`;
  const [receipt, setReceipt] = useState<Receipt | null>(() => readReceipt(storageKey));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [walletStep, setWalletStep] = useState<WalletStep>(null);
  const walletDialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);

  useEffect(() => {
    const dialog = walletDialog.current;
    if (!dialog) return;
    if (walletStep && !dialog.open) dialog.showModal();
    if (!walletStep && dialog.open) dialog.close();
  }, [walletStep]);

  function continueToWallet() {
    setWalletStep(null);
    void prepare();
  }

  async function prepare() {
    if (lock.current) return;
    if (!validDonationAmount(amount)) { setError("Enter an amount above 0 and up to 1,000 USDC, with at most 7 decimal places."); return; }
    const existing = readReceipt(storageKey);
    if (existing) { setReceipt(existing); return; }
    lock.current = true;
    setError("");
    setBusy("Connecting wallet…");
    const toastId = toast.show("Connecting wallet and preparing your donation…", "loading");
    try {
      const address = await connectDonationWallet();
      setBusy("Preparing your donation…");
      toast.show("Checking the creator wallet and preparing your donation…", "loading", toastId);
      const input = { handle, fan_public_key: address, amount_usdc: amount, fan_name: name.trim() || undefined, message: message.trim() || undefined };
      setReview({ ...await prepareDonation(input), input });
      toast.show("Donation quote ready. Review the details before signing.", "success", toastId);
    } catch (error) {
      const message = donationError(error);
      setError(message);
      toast.show(`Couldn’t prepare your donation. ${message}`, "error", toastId);
    }
    finally { lock.current = false; setBusy(""); }
  }

  async function pay() {
    if (lock.current || !review) return;
    const existing = readReceipt(storageKey);
    if (existing) { setReceipt(existing); return; }
    lock.current = true;
    setError("");
    setBusy("Review and sign in your wallet…");
    const toastId = toast.show("Waiting for you to review and sign in your wallet…", "loading");
    let pending: Receipt | null = null;
    try {
      const signed = await signDonation(review.quote, review.input);
      pending = { hash: review.hash, id: review.quote.donation_id, accepted: false };
      // Record the attempt before sending so refreshes don't invite a duplicate.
      sessionStorage.setItem(storageKey, JSON.stringify(pending));
      setBusy("Submitting your donation…");
      toast.show("Submitting your signed donation…", "loading", toastId);
      await submitDonation(pending.id, signed);
      pending = { ...pending, accepted: true };
      setReceipt(pending);
      try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch { /* Receipt remains visible in memory. */ }
      toast.show(`Donation sent to @${handle}. Thank you for supporting this creator!`, "success", toastId);
    } catch (error) {
      if (pending && readReceipt(storageKey)) {
        setReceipt(pending);
        const message = "We couldn’t confirm the submission result. Check the transaction below before making another donation.";
        setError(message);
        toast.show(message, "error", toastId);
      } else {
        const message = donationError(error);
        setError(message);
        toast.show(`Donation wasn’t submitted. ${message}`, "error", toastId);
      }
    } finally { lock.current = false; setBusy(""); }
  }

  return <section className="profile-tip-card donation-card" aria-labelledby={`${id}-title`}>
    <Heart size={25} aria-hidden="true" />
    <h3 id={`${id}-title`}>{block.title}</h3>
    {block.description && <p>{block.description}</p>}
    <span className="donation-note">Stellar testnet · Demo assets have no real value</span>
    {receipt ? <div className="donation-receipt" role="status">
      <h4>{receipt.accepted ? "Donation submitted" : "Check your donation status"}</h4>
      <p>{receipt.accepted ? "Your signed donation was accepted by Pact. View its network status below." : "A donation submission was attempted. Its result is not confirmed here; check the transaction before paying again."}</p>
      <a href={transactionLink(receipt.hash)} target="_blank" rel="noopener noreferrer">View transaction on Stellar Expert ↗</a>
      <small>Reference: {receipt.id}</small>
    </div> : review ? <div className="donation-review">
      <h4>Review your support</h4>
      <dl><div><dt>@{handle} receives</dt><dd>{review.input.amount_usdc} USDC</dd></div><div><dt>You pay up to</dt><dd>{review.quote.send_max_xlm} XLM</dd></div><div><dt>Network fee</dt><dd>{review.feeXlm} XLM</dd></div></dl>
      <small>From {review.input.fan_public_key.slice(0, 6)}…{review.input.fan_public_key.slice(-6)} · Testnet</small>
      <small className="donation-address">Recipient wallet: {review.destination}</small>
      {review.input.message && <p>“{review.input.message}”</p>}
      <div className="donation-actions"><Button disabled={!!busy} onClick={() => void pay()}>Sign & submit donation</Button><Button variant="outline" disabled={!!busy} onClick={() => { setReview(null); setError(""); }}>Back</Button></div>
    </div> : <form className="donation-form" onSubmit={(event) => { event.preventDefault(); setWalletStep("choice"); }}>
      <fieldset disabled={!!busy}>
        <legend>Choose your support</legend>
        <div className="donation-presets" role="group" aria-label="Donation amount">
          {presets.map((preset, index) => <Button key={`${preset}-${index}`} variant="outline" aria-pressed={!customAmount && amount === preset} onClick={() => { setCustomAmount(false); setAmount(preset); setError(""); }}>{preset} USDC</Button>)}
          {block.allowCustomAmount && <Button variant="outline" aria-pressed={customAmount} aria-expanded={customAmount} aria-controls={`${id}-custom`} onClick={() => { if (!customAmount) setAmount(""); setCustomAmount(true); setError(""); }}>Other</Button>}
        </div>
        {block.allowCustomAmount && customAmount && <div className="donation-field" id={`${id}-custom`}><Label htmlFor={`${id}-amount`}>Amount in USDC</Label><Input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required aria-describedby={`${id}-limit`} /><small id={`${id}-limit`}>Up to 1,000 USDC. Paid with test XLM.</small></div>}
        <div className="donation-field"><Label htmlFor={`${id}-name`}>Your name <span>(optional)</span></Label><Input id={`${id}-name`} autoComplete="name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Anonymous supporter" /></div>
        <div className="donation-field"><Label htmlFor={`${id}-message`}>Leave a message <span>(optional)</span></Label><Textarea id={`${id}-message`} maxLength={280} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="A little encouragement goes a long way." /></div>
        <Button type="submit" disabled={!validDonationAmount(amount)}>Connect wallet & review</Button>
      </fieldset>
      {!presets.length && !block.allowCustomAmount && <p>This creator hasn't set an available donation amount.</p>}
      <small>Connect a supported Stellar wallet and switch it to Testnet. On mobile, choose a wallet through WalletConnect.</small>
    </form>}
    <dialog
      ref={walletDialog}
      className="donation-wallet-dialog"
      aria-labelledby={`${id}-wallet-title`}
      onCancel={(event) => { event.preventDefault(); setWalletStep(null); }}
      onClick={(event) => { if (event.target === event.currentTarget) setWalletStep(null); }}
    >
      <button className="donation-wallet-close" type="button" aria-label="Close wallet help" onClick={() => setWalletStep(null)}><X size={20} /></button>
      {walletStep === "choice" ? <>
        <span className="donation-wallet-kicker">Before you continue</span>
        <h3 id={`${id}-wallet-title`}>Do you already have a Stellar wallet?</h3>
        <p>Choose an option and we’ll guide you through the next step.</p>
        <div className="donation-wallet-actions">
          <Button onClick={continueToWallet}>I already have a wallet</Button>
          <Button variant="outline" onClick={() => setWalletStep("varial")}>I need a wallet</Button>
        </div>
      </> : walletStep === "varial" ? <>
        <span className="donation-wallet-kicker">A quick setup</span>
        <h3 id={`${id}-wallet-title`}>Get started with Varial</h3>
        <ol className="donation-wallet-steps">
          <li><a href="https://varialwallet.com/" target="_blank" rel="noopener noreferrer">Get Varial from its official site</a> and create a wallet.</li>
          <li>Keep your recovery phrase private. Pact and Varial support will never ask you to share it.</li>
          <li>On mobile, open Varial, go to <strong>Discover</strong>, and enter this page’s address. On desktop, install the Varial browser extension.</li>
          <li>Return here and choose Varial in the wallet connection screen. If prompted, use Stellar Testnet; Pact donations use test assets.</li>
        </ol>
        <div className="donation-wallet-actions">
          <Button onClick={continueToWallet}>I’ve got Varial — connect</Button>
          <Button variant="outline" onClick={() => setWalletStep("choice")}>Back</Button>
        </div>
      </> : null}
    </dialog>
    {busy && <p role="status" aria-live="polite">{busy}</p>}
    {error && <p role="alert" className="donation-error">{error}</p>}
  </section>;
}
