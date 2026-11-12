import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import axios from "axios";
import { api, apiError } from "./api";
import { initWallet } from "./wallet";
import { hashHex, inspectDonation, parseQuote, parseReceived, type DonationQuote, type PrepareDonation } from "./donation-contract";

export function donationError(error: unknown): string {
  return axios.isAxiosError(error) ? apiError(error) : error instanceof Error ? error.message : "We couldn't complete this donation. Please try again.";
}

export async function connectDonationWallet() {
  initWallet();
  const { address } = await StellarWalletsKit.authModal();
  await checkWallet(address);
  return address;
}

export async function checkWallet(address: string) {
  const account = await StellarWalletsKit.getAddress();
  if (account.address !== address) throw new Error("Your wallet account changed. Go back and reconnect before donating.");
  const network = await StellarWalletsKit.getNetwork();
  if (network.networkPassphrase !== Networks.TESTNET) throw new Error("Switch your wallet to Testnet, then try again.");
}

export async function prepareDonation(input: PrepareDonation) {
  const profile = (await api.get<{ public_key?: unknown }>(`/users/${encodeURIComponent(input.handle)}`)).data;
  if (typeof profile.public_key !== "string" || !profile.public_key) throw new Error("This creator's donation wallet is unavailable.");
  const { data } = await api.post<unknown>("/donations/prepare", input);
  const quote = parseQuote(data);
  return { quote, ...inspectDonation(quote, input, profile.public_key) };
}

export async function signDonation(quote: DonationQuote, input: PrepareDonation) {
  await checkWallet(input.fan_public_key);
  const expected = inspectDonation(quote, input);
  const result = await StellarWalletsKit.signTransaction(quote.xdr, { networkPassphrase: quote.network_passphrase, address: input.fan_public_key });
  if (!result.signedTxXdr) throw new Error("Signing was cancelled. No donation was submitted.");
  if (result.signerAddress && result.signerAddress !== input.fan_public_key) throw new Error("The signing account changed. Please reconnect your wallet.");
  const signed = TransactionBuilder.fromXDR(result.signedTxXdr, Networks.TESTNET);
  if (hashHex(signed.hash()) !== expected.hash || !signed.signatures.length) throw new Error("The wallet returned a different or unsigned transaction.");
  if (Date.now() >= expected.expires) throw new Error("This quote expired while signing. Get a fresh quote.");
  return result.signedTxXdr;
}

export async function submitDonation(donationId: string, signedXdr: string) {
  // Never automatically retry: a timeout can happen after a payment is accepted.
  await api.post("/donations/submit", { donation_id: donationId, signed_xdr: signedXdr }, { timeout: 60_000 });
}

export async function receivedDonations(signal?: AbortSignal) {
  return parseReceived((await api.get<unknown>("/donations/received", { signal })).data);
}

export const transactionLink = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
