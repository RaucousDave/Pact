import { useState } from "react";
import { Heart } from "lucide-react";
import { useTip, type TipStatus } from "../lib/tip";
import { openWallet } from "../lib/wallet";
import "../tip-card.css";

const NGN_PER_USDC = 1500; // Demo rate, approximate.
const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad/i.test(navigator.userAgent);

const busy: Partial<Record<TipStatus, string>> = {
  connecting: "Connecting wallet…",
  preparing: "Preparing your tip…",
  signing: "Approve in your wallet…",
  submitting: "Sending…",
};

export function TipCard({
  handle,
  title,
  description,
  presetAmounts,
}: {
  handle: string;
  title: string;
  description?: string | null;
  presetAmounts: Array<number | string>;
}) {
  const amounts = presetAmounts.map(String);
  const [amount, setAmount] = useState(amounts[0] ?? "1");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const tip = useTip(handle);
  const working = tip.status in busy;

  if (tip.status === "success")
    return (
      <div className="tip-done" role="status">
        <Heart size={25} />
        <h3>Sent. Thank you!</h3>
        <p>Your {amount} USDC tip is on its way.</p>
        {tip.txHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${tip.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View receipt
          </a>
        )}
        <button type="button" className="tip-secondary" onClick={tip.reset}>
          Send another
        </button>
      </div>
    );

  return (
    <>
      {tip.pending && tip.status === "idle" && (
        <div className="tip-resume" role="status">
          <p>You have an unfinished {tip.pending.amountUsdc} USDC tip.</p>
          <button
            type="button"
            className="tip-send"
            onClick={() => {
              const pending = tip.pending;
              if (!pending) return;
              setAmount(pending.amountUsdc);
              setName(pending.fanName ?? "");
              setMessage(pending.message ?? "");
              void tip.send(pending);
            }}
          >
            Resume
          </button>
          <button type="button" className="tip-secondary" onClick={tip.discard}>
            Dismiss
          </button>
        </div>
      )}
      <Heart size={25} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      <div className="tip-amounts" role="group" aria-label="Tip amount">
        {amounts.map((a) => (
          <button
            key={a}
            type="button"
            className="tip-amount"
            aria-pressed={a === amount}
            disabled={working}
            onClick={() => setAmount(a)}
          >
            {a} USDC
            <small>≈ ₦{Math.round(Number(a) * NGN_PER_USDC).toLocaleString()}</small>
          </button>
        ))}
      </div>
      <input
        className="tip-input"
        placeholder="Your name (optional)"
        maxLength={40}
        value={name}
        disabled={working}
        onChange={(event) => setName(event.target.value)}
      />
      <textarea
        className="tip-input"
        placeholder="Leave a message (optional)"
        maxLength={280}
        rows={3}
        value={message}
        disabled={working}
        onChange={(event) => setMessage(event.target.value)}
      />
      <button
        type="button"
        className="tip-send"
        disabled={working || !amount}
        onClick={() => void tip.send({ amountUsdc: amount, fanName: name, message })}
      >
        {busy[tip.status] ?? `Send ${amount} USDC`}
      </button>
      {tip.status === "signing" && isMobile && (
        <button type="button" className="tip-secondary" onClick={() => void openWallet()}>
          Open wallet to approve
        </button>
      )}
      {tip.error && (
        <p className="tip-error" role="alert">
          {tip.error}
        </p>
      )}
    </>
  );
}
