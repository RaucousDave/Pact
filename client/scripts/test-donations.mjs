import assert from "node:assert/strict";
import { test } from "node:test";
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { inspectDonation, parseQuote, parseReceived, validDonationAmount } from "../src/lib/donation-contract.ts";

const fan = Keypair.random().publicKey();
const creator = Keypair.random().publicKey();
const issuer = Keypair.random().publicKey();
const input = { handle: "creator", fan_public_key: fan, amount_usdc: "5" };
function quote(overrides = {}) {
  const operation = Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: "60", destination: creator, destAsset: new Asset("USDC", issuer), destAmount: "5", path: [], ...overrides });
  const tx = new TransactionBuilder(new Account(fan, "1"), { fee: "100", networkPassphrase: Networks.TESTNET }).addOperation(operation).setTimeout(180).build();
  return { donation_id: "test", xdr: tx.toXDR(), network_passphrase: Networks.TESTNET, send_max_xlm: "60" };
}

test("amounts reject zero, negatives, overflow, exponent syntax and excess precision", () => {
  for (const value of ["0", "-1", "1000.0000001", "1e2", "0.00000001", "", "NaN", "Infinity"]) assert.equal(validDonationAmount(value), false, value);
  for (const value of ["1", "0.0000001", "1000", "5.50"]) assert.equal(validDonationAmount(value), true, value);
});
test("quotes must be complete and testnet-only", () => {
  assert.throws(() => parseQuote({}));
  assert.throws(() => parseQuote({ ...quote(), network_passphrase: Networks.PUBLIC }));
  assert.throws(() => parseQuote({ ...quote(), send_max_xlm: "NaN" }));
});
test("valid quote produces the hash, recipient and fee shown for review", () => {
  const result = inspectDonation(parseQuote(quote()), input);
  assert.match(result.hash, /^[a-f0-9]{64}$/);
  assert.equal(result.destination, creator);
  assert.equal(result.feeXlm, "0.0000100");
});
test("tampered transaction amount, spend cap, asset and source are blocked", () => {
  assert.throws(() => inspectDonation(quote({ destAmount: "50" }), input));
  assert.throws(() => inspectDonation(quote({ sendMax: "600" }), input));
  assert.throws(() => inspectDonation(quote({ sendAsset: new Asset("USD", issuer) }), input));
  assert.throws(() => inspectDonation(quote({ destAsset: new Asset("OTHER", issuer) }), input));
  assert.throws(() => inspectDonation(quote(), { ...input, fan_public_key: creator }));
  assert.throws(() => inspectDonation(quote({ source: creator }), input));
  assert.throws(() => inspectDonation(quote(), input, fan), /recipient/);
});
test("expired transactions cannot be signed", () => {
  const tx = new TransactionBuilder(new Account(fan, "1"), { fee: "100", networkPassphrase: Networks.TESTNET, timebounds: { minTime: 0, maxTime: 1 } }).addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: "60", destination: creator, destAsset: new Asset("USDC", issuer), destAmount: "5", path: [] })).build();
  assert.throws(() => inspectDonation({ ...quote(), xdr: tx.toXDR() }, input), /expired/);
});
test("history accepts explicit supported envelopes, never hides an unknown response as empty", () => {
  assert.deepEqual(parseReceived([]), []);
  assert.deepEqual(parseReceived({ donations: [] }), []);
  assert.throws(() => parseReceived({ items: [] }));
  assert.throws(() => parseReceived([{ amount_usdc: "bad" }]));
  assert.equal(parseReceived([{ id: 1, amount_usdc: "5", tx_hash: "javascript:alert(1)" }])[0].hash, undefined);
  assert.equal(parseReceived([{ id: 1, amount_usdc: "5" }])[0].name, "Anonymous supporter");
});
