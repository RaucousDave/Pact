# Pact client

All frontend work lives in this directory. The server directory is unchanged.

## Run

```sh
bun install
bun run dev
bun run build
bun run lint
```

Routes: `/` (landing), `/signup`, `/login`, `/account` (profile dashboard), `/onboarding` (profile editing), `/preview` (local theme preview), and `/:username` (public profile). `/auth` and `/register` redirect to their canonical routes. Configure production hosting to serve `index.html` for client routes, including direct visits and refreshes at `/limitless`.

## Public profile links

The account dashboard shows an absolute URL based on the current frontend origin, with copy and view actions. Public profiles use the existing unauthenticated `GET /api/v1/users/{handle}/page` endpoint and display the saved identity, theme, social links, and visible content blocks. They never render account email or sample links. Missing profiles and network failures have separate states.

The editor loads `GET /api/v1/users/me/page`, saves the complete theme/socialLinks/blocks payload with `PUT /api/v1/users/me/page`, and uploads background images, thumbnails, and image blocks with `POST /api/v1/users/me/page/assets`. Uploads accept JPG, PNG, WebP, or GIF up to 5MB; the backend verifies file contents. Theme adapters translate gradient `from` and emit only the fields permitted for each background variant. Browser-only theme drafts are no longer the source of truth. Save failures retain edits, and restoring uses the last successful save. Heading blocks are centered by default. Public tip cards use the donation flow described below; commission booking remains unavailable.

Signup blocks app-route names on the frontend. Backend validation is unchanged; existing accounts with conflicting names need a separate resolution before they can use a root-level profile URL. Deploy the frontend with SPA fallback routing and a publicly accessible domain for links shared on social media. Localhost links are only usable on the local machine.

## Backend

Axios and TanStack Query handle all API requests. The contract follows `server/app/api/v1/endpoints/auth.py`:

| Endpoint                         | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `POST /api/v1/auth/register`     | Email, password, display name, handle; creates a testnet wallet |
| `POST /api/v1/auth/login`        | Email/password authentication                                   |
| `POST /api/v1/auth/check-handle` | Debounced handle availability query                             |
| `GET /api/v1/auth/me`            | Authenticated account confirmation                              |

The provided backend supports HTTPS: `https://pact-backend.fastapicloud.dev`. Development uses a Vite `/api` proxy; production defaults to that HTTPS backend. Override `VITE_API_BASE_URL` if needed (include `/api/v1`). Production deployments need their frontend origin allowed by backend CORS, or a same-origin reverse proxy. Never put secrets in Vite environment variables.

Sessions use a bearer token in tab-scoped `sessionStorage` (memory fallback if storage is blocked). Passwords are never stored. Expired `/me` requests clear the session. This is demo custody, not production wallet security. Registration has a two-minute timeout for Friendbot/trustline setup; mutations are not retried automatically. After a timeout, try logging in before registering again.

## Scope

Included: responsive landing page, signup/login validation, live handle checks, API errors and loading states, account confirmation, logout, routing, and animation accessibility.

The landing, auth, and account surfaces include a persisted dark mode toggle. It follows the system preference on first visit, avoids a light flash with `public/theme-init.js`, and respects reduced motion. The authenticated account surface also consumes `PATCH /auth/profile` for display name, bio, and avatar URL updates.

Public tip cards now integrate the deployed donation API with Freighter on Stellar testnet. Deferred: escrow, QR codes, confetti, and withdrawals. Marketing illustrations are labeled previews and do not move money. The photo illustrates a fictional creator, not an endorsement.

## Donations

Public tip cards offer centered preset amounts and an Other option when the creator allows custom amounts. The custom USDC input is shown only after choosing Other. Form controls use the shared shadcn-style Button, Input, Label, and Textarea components. Editor previews remain non-transactional.

The client connects a Freighter browser-extension wallet on Testnet, checks the creator wallet through `GET /users/{handle}`, and calls `POST /donations/prepare` with `handle`, `fan_public_key`, `amount_usdc`, and optional `fan_name` / `message`. Before signing, it checks the XDR source, single strict-receive path-payment operation, recipient, XLM send maximum, USDC destination amount, and expiry. The review shows the amount received, maximum spend, and fee. The user signs in Freighter; the client then sends `donation_id` and `signed_xdr` to `POST /donations/submit`. Signing never requires entering a wallet secret into Pact.

There are no automatic payment retries. A tab-scoped receipt is saved before submission, and uncertain results retain the transaction hash and explorer link across refreshes. Session storage must be available before submission. A successful HTTP response is described as submitted, not confirmed on-chain. The transaction network is restricted to Testnet even if the API returns another passphrase.

The account dashboard loads authenticated `GET /donations/received` with loading, empty, error, and refresh states. The deployed OpenAPI leaves its response untyped: the adapter currently accepts an array or a `{ donations: [...] }` envelope, with `amount_usdc`, optional `fan_name`, `message`, `status`, and `tx_hash`. These history formats remain assumptions pending an authenticated live response; unsupported formats display an error rather than an empty history. The local backend snapshot does not implement donations; use the configured deployed API/proxy.

Validation: `bun run build`, `bun run lint`, and `node --test scripts/test-donations.mjs scripts/test-page-model.mjs`. Donation tests cover amount boundaries, testnet-only quotes, transaction amounts/assets/source/recipient, expiry, and history parsing. Real wallet approval, live payment submission, authenticated history response shape, and browser visual QA remain unverified. The browser access host was unavailable during implementation.

## Design, motion and assets

The visual direction is inspired by https://www.clay.com/: spacious editorial hierarchy, warm oat backgrounds, light typography, and a playful illustrated product explanation. Pact uses its own copy, colors, and original SVG payment playground; no Clay artwork, brand assets, or proprietary fonts are copied. `src/theme.css` is the final visual theme layered over the component and responsive layout styles. Orange is the primary action accent.

Uses the existing `motion` package: spring-based cursor tilt, a shared amount selector, animated receipt values, coordinated hero entry, and short auth entry transitions. CSS handles press feedback. Reduced-motion preferences are respected; cursor tilt is disabled for touch and reduced motion. The layout and motion approach follows frontend-design and Emil Kowalski's `animate` skill: https://github.com/emilkowalski/skills/tree/main/skills/animate.

Fonts: DM Sans, Instrument Serif, and Manrope via Google Fonts, with system fallbacks. The preview portrait is stored locally in `public/creator.jpg`, from https://images.unsplash.com/photo-1534528741775-53994a69daeb. Geometric artwork and the Pact mark are native CSS/SVG.

## Verification

The production build and ESLint passed. The deployed handle-availability endpoint returned the expected `{ available, handle }` response, and unauthenticated `/auth/me` returned HTTP 401. Successful live signup/login was not exercised. Browser visual inspection was blocked because the computer-use provider could not verify the active browser URL; mobile layout and animation feel still need a browser review.

Run `bun run build` and `bun run lint`. Check signup/login at mobile and desktop widths, empty and invalid fields, password visibility, handle availability, server errors, and keyboard focus. Successful live registration requires a healthy backend database, Friendbot funding, and a configured USDC issuer. Do not confuse the preview widgets with functioning payment flows.
