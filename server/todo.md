Here is the complete technical and product breakdown for **Pact v1**, structured to map directly to a fast 2-person build.

---

## 1. UI Flow (Detailed Screen-by-Screen)

```
[Fan Side]                                [Creator Side]
Public Profile (/:handle)                 Sign Up / Onboarding
       │                                         │
       ├──> [Tip Modal]                          ├──> [Creator Dashboard]
       │       │                                 │       ├── Metrics & Balances
       │       ├── Select Asset & Amount         │       ├── Live Supporter Feed
       │       ├── Fetch Quote & Path            │       └── Payout CTA
       │       └── Submit Atomic Tx              │
       │                                         ├──> [Escrow Workspace]
       └──> [Commission Modal]                   │       ├── Accept Request
               │                                 │       ├── Submit Delivery Link
               └── Create Escrow & Fund          │       └── Dispute / Release
                                                 │
                                                 └──> [Mock SEP-24 Off-Ramp]
                                                         ├── Bank Picker & Details
                                                         ├── Rate & Settlement Review
                                                         └── Success State

```

---

### A. Creator Onboarding Flow

1. **Sign Up & Profile Setup (`/onboard`)**
* **Form Fields:** Unique Handle (`@handle`), Display Name, Bio, Avatar URL / file picker.
* **One-Click Keypair Provisioning:** User clicks *"Launch Creator Page"*.
* **Under the Hood:** Client calls backend to register the profile. The backend creates a keypair, calls Stellar Friendbot to fund with test XLM, creates a trustline for test `USDC`, and stores the public key.
* **Success / Redirect:** Redirects directly to `/dashboard` with a banner: *"Your testnet wallet is funded and USDC-ready."*


2. **Creator Dashboard (`/dashboard`)**
* **Header:** Creator handle, testnet wallet public address (with copy button), link to public page (`pact.xyz/@handle`), and active testnet tag.
* **Stat Cards:**
* Available Balance (`$X.XX USDC`).
* Total Volume Received.
* Active Commissions Count.


* **Action Bar:** Primary *"Withdraw to Nigerian Bank"* button (triggers mock SEP-24).
* **Tabbed Views:**
* **Tab 1: Recent Support:** List of tips (Fan Address / Anonymous, Amount in USDC, Original asset sent, Message, Explorer link).
* **Tab 2: Commission Workspace:** Active and historical commission jobs with real-time status chips (`Requested`, `Funded`, `Delivered`, `Released`, `Disputed`).





---

### B. Fan Donation Flow (Public Creator Page `/:handle`)

1. **Creator View (`/:handle`)**
* Bio, avatar, social handles, and a **"Recent Supporters"** micro-feed.
* Prominent **Tipping Card** + **Commissions Catalog**.


2. **Tip Card & Asset Selector**
* **Step 1 — Preset Buttons:** `$1`, `$5`, `$10`, or Custom input in USDC.
* **Step 2 — "Pay with" Dropdown:**
* `NGNT` (Nigerian Naira Token)
* `XLM` (Native Lumen)


* **Step 3 — Dynamic Path Quote Box:**
* Displays: *"You pay: ~₦7,800 NGNT (Rate: 1 USDC ≈ 1,560 NGNT) + < $0.00001 network fee"*.
* Includes a debounced live fetch against Horizon's `/paths/strict-receive`.
* Shows a fallback banner if liquidity is low: *"Routing via direct path..."*


* **Step 4 — Message Field:** Optional memo (*"Love your work! Keep building."*).


3. **Transaction Execution & Feedback Modal**
* User clicks *"Confirm & Pay"*.
* **State A (Pending):** Progress loader: *"Submitting atomic path payment on Stellar testnet..."*
* **State B (Success):** Confetti animation, *"Sent $5.00 USDC to @handle"*, exact amount paid in NGNT/XLM, and an outbound link: *"View on Stellar Expert"*.



---

### C. Escrow Commission Flow

1. **Request Commission (`/:handle` -> Commission Card)**
* Fan selects an offering (e.g., *"Custom Pixel Art Avatar - $25 USDC"*).
* Fan inputs delivery instructions/brief and contact handle.
* Commission status: `REQUESTED`.


2. **Creator Acceptance (`/dashboard`)**
* Creator views incoming request card with brief and price.
* Creator clicks *"Accept Commission"*.
* App triggers backend to spawn a dedicated 2-of-3 multisig escrow account on-chain.
* Commission status: `ACCEPTED`.


3. **Funding Stage (Fan View: `/commission/:id`)**
* Fan receives a funding link.
* Fan chooses pay asset (`NGNT` or `XLM`). App quotes path to exactly `$25 USDC`.
* Fan confirms payment; Path payment funds the escrow account with `$25 USDC`.
* Timeline updates: `FUNDED` (with deposit tx hash).


4. **Delivery & Release**
* **Creator:** Pastes delivery link (Drive, Figma, GitHub, etc.) and clicks *"Mark Work Delivered"*. Status: `DELIVERED`.
* **Fan:** Inspects delivery.
* **Action A (Release):** Clicks *"Approve & Release Funds"*. Fan signs release tx; backend co-signs and broadcasts. Status updates to `RELEASED`. Funds hit creator's wallet.
* **Action B (Dispute):** Clicks *"Raise Dispute"*. Status becomes `DISPUTED`. Enters platform arbitration queue.





---

### D. Off-Ramp Flow (Mocked SEP-24 Modal)

1. **Trigger:** Creator clicks *"Withdraw to Bank"* on dashboard.
2. **Step 1 (Amount):** Input USDC to withdraw (e.g., `$50.00 USDC`).
3. **Step 2 (Bank Selection):**
* Select Nigerian Bank (Mock dropdown: *Access Bank, Kuda Bank, GTBank, Zenith*).
* Account Number (10 digits).
* Account Name (auto-resolves mock verification: *"Treasure Ani-Joseph"*).


4. **Step 3 (Settlement Review):**
* Anchor spread: ~1.2%.
* Est. Naira Received: `₦77,220 NGN`.
* Payout method: Instant NIP transfer.


5. **Step 4 (Completion):**
* Simulated spinner: *"Anchor validating SEP-24 interactive session..."*
* Success card with mock transaction reference and explanation note: *"In production, this completes via an authorized SEP-24 NGN anchor like Cowrie directly to your NUBAN."*



---

## 2. Backend Architecture & Responsibilities

Since this is a testnet demo with app-managed keys, the backend acts as:

1. **The Orchestrator:** Manages keypairs, funds wallets with Friendbot, and establishes trustlines.
2. **The Escrow Arbiter:** Holds the platform arbiter keypair to sign 2-of-3 multisig releases or disputes.
3. **The Market Maker / Seeder (Cron/Script):** Ensures the order book stays liquid so path payments never fail.

### Tech Stack Recommendation

* **Runtime:** Node.js with TypeScript (`tsx` or `ts-node-dev`).
* **Framework:** Express or Fastify.
* **Database:** SQLite (via Prisma or Drizzle) — zero overhead, no remote DB latency, easy to reset before the demo.
* **Stellar Library:** `@stellar/stellar-sdk`.

---

## 3. Database Schema

```prisma
model Creator {
  id           String        @id @default(uuid())
  handle       String        @unique
  displayName  String
  bio          String?
  avatarUrl    String?
  publicKey    String        @unique
  secretKey    String        // Encrypted / plain for testnet demo only
  createdAt    DateTime      @default(now())
  tips         Tip[]
  commissions  Commission[]
}

model Tip {
  id           String        @id @default(uuid())
  creatorId    String
  creator      Creator       @relation(fields: [creatorId], references: [id])
  fanPublicKey String
  assetSent    String        // "NGNT" or "XLM"
  amountSent   String
  amountUsdc   String        // Target amount received
  txHash       String        @unique
  message      String?
  createdAt    DateTime      @default(now())
}

model Commission {
  id              String           @id @default(uuid())
  creatorId       String
  creator         Creator          @relation(fields: [creatorId], references: [id])
  fanPublicKey    String?
  title           String
  description     String
  priceUsdc       String
  status          CommissionStatus @default(REQUESTED)
  escrowPublicKey String?
  escrowSecretKey String?          // Platform handles testnet escrow account setup
  deliveryUrl     String?
  txHashFunding   String?
  txHashRelease   String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

enum CommissionStatus {
  REQUESTED
  ACCEPTED
  FUNDED
  DELIVERED
  RELEASED
  REFUNDED
  DISPUTED
}

```

---

## 4. API Endpoints

### A. Creators & Profiles

* `POST /api/creators/register`
* **Payload:** `{ handle, displayName, bio, avatarUrl }`
* **Action:** Generates Keypair -> Friendbot funding -> Creates USDC trustline -> Saves DB record.
* **Response:** `{ creator: { id, handle, publicKey }, balanceUsdc: "0.00" }`


* `GET /api/creators/:handle`
* **Response:** Creator profile, active commission catalog, public key, and recent tip messages.


* `GET /api/creators/:handle/balance`
* **Action:** Queries Horizon for the account's balances and extracts the `USDC` trustline amount.



---

### B. Path Payments & Tips

* `GET /api/payments/quote`
* **Query Params:** `?destinationAsset=USDC&destinationAmount=5&sourceAsset=NGNT`
* **Action:** Calls Horizon `/paths/strict-receive` using platform issuer asset codes.
* **Response:**
```json
{
  "sourceAsset": "NGNT",
  "sourceAmount": "7800.50",
  "sendMax": "7878.50", // 1% buffer included
  "destinationAmount": "5.00",
  "path": []
}

```




* `POST /api/payments/record`
* **Payload:** `{ creatorHandle, fanPublicKey, assetSent, amountSent, amountUsdc, txHash, message }`
* **Action:** Verifies transaction status on Horizon testnet, then persists to `Tip` table.



---

### C. Escrow Lifecycle

* `POST /api/commissions/request`
* **Payload:** `{ creatorHandle, title, description, priceUsdc, fanPublicKey }`
* **Response:** Commission object with `status: "REQUESTED"`.


* `POST /api/commissions/:id/accept`
* **Action:**
1. Spawns a new escrow keypair.
2. Platform account funds it with baseline XLM reserve via Friendbot.
3. Adds USDC trustline on the escrow account.
4. Sets options for 2-of-3 multisig: thresholds = 2; signers = `[FanKey (w=1), CreatorKey (w=1), ArbiterKey (w=1)]`.
5. Stores keys and sets status to `ACCEPTED`.


* **Response:** `{ escrowPublicKey, status: "ACCEPTED" }`


* `POST /api/commissions/:id/mark-funded`
* **Payload:** `{ txHash }`
* **Action:** Confirms escrow USDC balance == `priceUsdc`, sets status to `FUNDED`.


* `POST /api/commissions/:id/deliver`
* **Payload:** `{ deliveryUrl }`
* **Action:** Sets `deliveryUrl` and updates status to `DELIVERED`.


* `POST /api/commissions/:id/release`
* **Payload:** `{ fanSignedTxXdr }`
* **Action:**
1. Validates fan signature.
2. Arbiter key adds second signature to the transaction (which transfers the USDC from the escrow account to the creator's address).
3. Horizon submits transaction.
4. Sets status to `RELEASED`.


* **Response:** `{ txHashRelease, status: "RELEASED" }`


* `POST /api/commissions/:id/dispute`
* **Payload:** `{ reason, raisedBy }`
* **Action:** Marks status as `DISPUTED`. Notifies arbiter dashboard.


* `POST /api/commissions/:id/resolve-dispute` (Admin/Arbiter only)
* **Payload:** `{ decision: "REFUND_FAN" | "RELEASE_CREATOR" }`
* **Action:** Arbiter signs and releases escrow funds to the target recipient.



---

### D. Mock SEP-24 Bank Withdrawal

* `GET /api/anchor/banks`
* **Response:** Array of mock Nigerian banks (`{ code: "058", name: "GTBank" }`, etc.).


* `POST /api/anchor/quote`
* **Payload:** `{ amountUsdc }`
* **Response:** `{ exchangeRate: 1545.00, feeUsdc: 0.50, estimatedNgn: 76477.50 }`


* `POST /api/anchor/withdraw`
* **Payload:** `{ amountUsdc, bankCode, accountNumber, creatorId }`
* **Action:** Simulates SEP-24 off-ramp, returns a mock settlement receipt.



---

## 5. Critical Stellar Scripts to Write First

Before touching the UI, get these 2 backend scripts running:

1. **`scripts/seed-assets.ts` (Issuer Setup & Liquidity)**
* Create an **Issuer Account** and a **Distributor / Market Maker Account**.
* Issuer issues custom `NGNT` and `USDC` assets to the Distributor.
* Market Maker places standing testnet orders via `ManageBuyOffer` / `ManageSellOffer`:
* Offer 1: Sell `USDC` for `NGNT` (e.g., at price `1550 NGNT/USDC`).
* Offer 2: Sell `USDC` for `XLM` (e.g., at price `10 XLM/USDC`).


* *Keep this runnable with `npm run seed` so you can re-hydrate liquidity instantly if testnet gets reset.*


2. **`scripts/test-path-payment.ts`**
* Script that executes an end-to-end `PathPaymentStrictReceiveOperation` sending `NGNT` and ensuring the recipient receives exact `USDC`.
* This proves the core mechanic works before connecting frontend inputs.

funded: True
public: GDTEQ5SN2FN4DJE2QFYERY4LYZTTIVAYSAAREAASBAQEODE4PGDCKCID
secret: SBFFHO4X7AOVJ5ZO62QKS25NA6I3Y6HEPVFP73FIABLD4ASGVJOWGIAX


(server) treasure@april-may1229:~/Desktop/Pact$ python server/scripts/seed_liquidity.py
e2b6081605b84d0a39b7dcb67a484d727aa60929e83c6522f4a183909bcd6962


codex prompt:

okay, so we're going to build something like this.
the creator's form where they choose, and the person who's commisioning's screen (as in what they see when they click the commision link the creator sends them).

So, the UI would have this

Your `ProfileBlock` type settles the data question. The commission block is just `{ type: "commission"; commissionId: string }`, so a commission is its own record in the backend and the block only points to it. Right now the editor makes the creator type a commission ID by hand. The new form creates the commission and fills that ID in automatically.

## The creator form: 4 fields

| Field | Rules |
|---|---|
| **Title** | Required, max 60 characters. |
| **What you'll deliver** | Required, max 300 characters. |
| **Price (USDC)** | Required. Show a live "≈ ₦X" beside it, like the tip card. |
| **Delivery time (days)** | Required, whole number, default 7. |

The rest is fixed by us (the devs), not the creator: the review window is 3 days, and the offer is always open. On save, the form calls `POST /commissions`, gets back an `id`, and sets it as the block's `commissionId`. You keep `validateContent` as is.

## What the client sees

The creator pastes the link into the DM, or the client taps the card on the profile. Either way they land on a public page, `/:username/commission/:commissionId`, with no login. Top to bottom:

1. **Header:** the creator's avatar, name and `@handle`, with a small "Back to profile" link.
2. **Title** as the page heading.
3. **Price:** "25 USDC" large, with "≈ ₦37,500" small underneath.
4. **Delivery:** "Delivered within 7 days of payment."
5. **What you'll get:** the creator's description.
6. **How the payment is protected:** three short lines.
   - Your payment is locked in a smart contract, not held by Pact.
   - When the work is delivered, you approve it and the creator is paid. If you don't respond within 3 days, it's released automatically.
   - If it isn't delivered by the deadline, you can take your money back.
7. **Request form:**
   - Your name (required)
   - Note to the creator (optional), e.g. "Reference photos, size, where it'll be used"
   - How to reach you (optional), for when someone arrives from the profile instead of a DM
8. **Button:** "Pay 25 USDC into escrow", with a small line under it: "Held by a smart contract until you approve."

**After they click**, the button steps through the same states as the tip card: "Connecting wallet…", "Approve in your wallet…", "Locking funds…". The success screen says "Escrow funded. [Creator] can start now", with the deadline date. It also shows an **order link** with a "Copy link" button and a note to keep it. They have no account, so that link is how they come back to approve the delivery or claim a refund later.


RECOVERY PHRASE: cube involve knock hour honey stable kite antenna deputy tortoise topic exhibit unit boil whip evoke merry reason sketch diet material excuse immense swallow
