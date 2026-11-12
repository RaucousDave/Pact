import { useRef, useState } from "react";
import axios from "axios";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { api, apiError } from "./api";
import { initWallet } from "./wallet";

export type TipStatus =
  | "idle"
  | "connecting"
  | "preparing"
  | "signing"
  | "submitting"
  | "success"
  | "error";

type PrepareOut = {
  donation_id: string;
  xdr: string;
  network_passphrase: string;
  send_max_xlm: string;
};

type TipInput = { amountUsdc: string; fanName?: string; message?: string };

export function useTip(handle: string) {
  const [status, setStatus] = useState<TipStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const address = useRef<string | null>(null);
  const key = `pact-tip:${handle}`;
  const [pending, setPending] = useState<TipInput | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  });

  function discard() {
    sessionStorage.removeItem(key);
    setPending(null);
  }

  async function send(input: TipInput) {
    setError(null);
    sessionStorage.setItem(key, JSON.stringify(input));
    setPending(input);
    try {
      initWallet();
      if (!address.current) {
        setStatus("connecting");
        address.current = (await StellarWalletsKit.authModal()).address;
      }

      setStatus("preparing");
      const prep = (
        await api.post<PrepareOut>("/donations/prepare", {
          handle,
          fan_public_key: address.current,
          amount_usdc: input.amountUsdc,
          fan_name: input.fanName?.trim() || null,
          message: input.message?.trim() || null,
        })
      ).data;

      setStatus("signing");
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(prep.xdr, {
        networkPassphrase: prep.network_passphrase,
        address: address.current,
      });

      setStatus("submitting");
      const done = (
        await api.post<{ tx_hash: string }>("/donations/submit", {
          donation_id: prep.donation_id,
          signed_xdr: signedTxXdr,
        })
      ).data;

      setTxHash(done.tx_hash);
      discard();
      setStatus("success");
    } catch (e) {
      discard();
      // Closing the wallet modal or rejecting the signature isn't an error.
      const msg = (e as { message?: string })?.message ?? "";
      if (!axios.isAxiosError(e) && /clos|cancel|reject|declin|denied/i.test(msg)) {
        setStatus("idle");
        return;
      }
      if (/session/i.test(msg)) {
        address.current = null;
        setStatus("error");
        setError("Your wallet session expired. Tap send to reconnect.");
        return;
      }
      console.error(e);
      setStatus("error");
      setError(
        axios.isAxiosError(e)
          ? apiError(e)
          : "Couldn’t complete the tip. Check your wallet and try again.",
      );
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }

  return { status, error, txHash, send, reset, pending, discard };
}
