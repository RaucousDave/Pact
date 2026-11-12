import { Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";

export interface PrepareDonation {
  handle: string;
  fan_public_key: string;
  amount_usdc: string;
  fan_name?: string;
  message?: string;
}

export interface DonationQuote {
  donation_id: string;
  xdr: string;
  network_passphrase: string;
  send_max_xlm: string;
}

export function validDonationAmount(value: string): boolean {
  return /^\d+(\.\d{1,7})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000;
}

export const hashHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseQuote(value: unknown): DonationQuote {
  if (!record(value) || !["donation_id", "xdr", "network_passphrase", "send_max_xlm"].every((key) => typeof value[key] === "string" && value[key])) {
    throw new Error("The donation quote was incomplete. Please try again.");
  }
  if (value.network_passphrase !== Networks.TESTNET) throw new Error("Donations are available on Stellar testnet only.");
  if (!/^\d+(\.\d{1,7})?$/.test(String(value.send_max_xlm)) || Number(value.send_max_xlm) <= 0) throw new Error("The donation quote has an invalid XLM cost.");
  return value as unknown as DonationQuote;
}

// Verify the displayed quote against the transaction before asking for a signature.
export function inspectDonation(quote: DonationQuote, input: PrepareDonation, recipient?: string) {
  const transaction = TransactionBuilder.fromXDR(quote.xdr, Networks.TESTNET);
  if (!(transaction instanceof Transaction) || transaction.source !== input.fan_public_key || transaction.operations.length !== 1) {
    throw new Error("The prepared transaction does not match this donation.");
  }
  const operation = transaction.operations[0];
  if (operation.type !== "pathPaymentStrictReceive" || !operation.sendAsset.isNative() || operation.destAsset.getCode() !== "USDC" || Number(operation.destAmount) !== Number(input.amount_usdc) || Number(operation.sendMax) !== Number(quote.send_max_xlm) || (operation.source && operation.source !== input.fan_public_key)) {
    throw new Error("The prepared payment does not match the reviewed amounts.");
  }
  const expires = Number(transaction.timeBounds?.maxTime || 0) * 1000;
  if (recipient && operation.destination !== recipient) throw new Error("The payment recipient does not match this creator's wallet.");
  if (!expires || expires <= Date.now()) throw new Error("This quote has expired. Get a fresh quote.");
  return { hash: hashHex(transaction.hash()), feeXlm: (Number(transaction.fee) / 1e7).toFixed(7), destination: operation.destination, expires };
}

export interface ReceivedDonation {
  id: string;
  name: string;
  amount: string;
  message?: string;
  status?: string;
  hash?: string;
}

// The deployed OpenAPI leaves this response untyped. Reject unknown envelopes
// instead of silently presenting an empty donation history.
export function parseReceived(value: unknown): ReceivedDonation[] {
  const rows = Array.isArray(value) ? value : record(value) && Array.isArray(value.donations) ? value.donations : null;
  if (!rows) throw new Error("Donation history returned an unsupported format. Please try again later.");
  return rows.map((row, index) => {
    if (!record(row) || !["string", "number"].includes(typeof row.amount_usdc) || !Number.isFinite(Number(row.amount_usdc)) || Number(row.amount_usdc) <= 0) {
      throw new Error("Donation history contains an incomplete record. Please try again later.");
    }
    return {
      id: String(row.id ?? row.donation_id ?? index),
      name: typeof row.fan_name === "string" && row.fan_name.trim() ? row.fan_name : "Anonymous supporter",
      amount: String(row.amount_usdc),
      message: typeof row.message === "string" ? row.message : undefined,
      status: typeof row.status === "string" ? row.status : undefined,
      hash: typeof row.tx_hash === "string" && /^[a-f0-9]{64}$/i.test(row.tx_hash) ? row.tx_hash : undefined,
    };
  });
}
