# housesigma-mcp

A Model Context Protocol (MCP) server that exposes HouseSigma listing data to
Claude Code and Codex CLI as tools.

> **Heads up.** HouseSigma has no public API. This server talks to the same
> private JSON endpoints their web app uses, using your own logged-in
> credentials. Automated access is contrary to HouseSigma's Terms of Service —
> running this is at your own discretion. Don't redistribute the data you
> retrieve.

## Tools exposed

| Tool | Purpose |
|---|---|
| `search_address` | Free-text address / postal-code search. Returns candidate hits with `id_listing`. |
| `get_listing` | Full detail for one `id_listing` (price, beds/baths, sqft, MLS#, brokerage, description). |
| `get_listing_history` | All prior MLS records for a property — list dates, end dates, status (Sold / Terminated / Suspended / Expired), price changes, days on market. |
| `get_comparables` | HouseSigma's sold/active comparables (`/listing/nearby/sold` + `/listing/nearby/sale`). |
| `lookup_property` | One-shot: take an address, return top hit + detail + full history. |

## Setup

Requires Node.js 20+.

```bash
npm install
npm run build
```

Create a `.env` (see `.env.example`):

```env
HOUSESIGMA_EMAIL=you@example.com
HOUSESIGMA_PASSWORD=...
# OR, if email/password login fails (rare):
HOUSESIGMA_TOKEN=eyJ...   # bearer token from a logged-in browser
```

Smoke-test:

```bash
node dist/smoke.js "35 Jonathan Street Uxbridge"
```

## Install into Claude Code

This repo ships with a `.mcp.json` at the root, so Claude Code picks the
server up automatically when launched from this directory:

```bash
cd /path/to/restoration-pm
claude mcp list
# housesigma: node ./dist/index.js - ✓ Connected
```

If you want it available globally instead, drop the same entry into
`~/.claude/settings.json` under `mcpServers`, using an absolute path:

```json
{
  "mcpServers": {
    "housesigma": {
      "command": "node",
      "args": ["/absolute/path/to/restoration-pm/dist/index.js"]
    }
  }
}
```

The tools surface as `mcp__housesigma__search_address`,
`mcp__housesigma__get_listing_history`, etc.

## Install into Codex CLI

Codex reads MCP servers from `~/.codex/config.toml`:

```toml
[mcp_servers.housesigma]
command = "node"
args = ["/absolute/path/to/restoration-pm/dist/index.js"]
```

Then in any Codex session, `/mcp` should list `housesigma` as connected.

## How it works (reverse-engineered architecture)

HouseSigma's web app at `https://housesigma.com` calls a private JSON API
under `/bkv2/api/...`. There is no documented public spec. The bundle at
`https://housesigma.com/assets/index.*.js` was the source for everything
below; see `src/housesigma/endpoints.ts` and `src/housesigma/client.ts`.

### Auth (two-step)

1. **Bootstrap.** `POST /init/accesstoken/new` with an empty body returns
   `{ data: { access_token, secret: { secret_key, ... } } }`. The
   `access_token` is a guest token; the `secret_key` is the 16-byte AES
   key for encrypted endpoints.
2. **Sign in.** `POST /auth/user/signin` with
   `{ email, pass, login_type: "normal", token: <guest_token> }` and
   `Authorization: Bearer <guest_token>`. On success the same token is
   server-side upgraded to a user session — no new bearer is returned.

Required headers on every call: `HS-Client-Type: desktop_v7`,
`HS-Client-Version: 7.22.2`.

### Request signing

A subset of endpoints (`detail_v2`, `mapsearchv3/*`) need a signed body:

```
ts        = floor(Date.now() / 1000)
qs        = sort(keys(body), DESC) -> "k=v&k=v..." (URI-encoded, lowercased)
signature = md5(qs + ts + apiSalt)
```

`apiSalt` is `ZckdTeV3kGyZd80q` (from `window.Ke.apiSalt`). `signature`
and `ts` are appended to the body.

### Request/response encryption

Endpoints in `ENCRYPTED_ENDPOINTS` (`/listing/info/detail_v2` and friends)
use AES-128-CTR for body, RSA-OAEP-SHA1 for the IV, and gzip on the
response:

- **Request.** Generate 16 random bytes (`counter`). Encrypt
  `JSON(body + {hs_request_timestamp: ts})` with `AES-CTR(secretKey, counter)`
  to get `et_payload`. RSA-OAEP-SHA1-encrypt `counter` with HouseSigma's
  public key to get `ctr`. Send `{ ctr, et_payload }` (base64) plus the
  header `Hs-Request-Timestamp: <ts>`.
- **Response.** `data` is base64. Decode → `AES-CTR(secretKey, counter)`
  decrypt → `gunzip` → `JSON.parse`.

### Per-listing TOS gates

HouseSigma masks data from TREB/PROPTX sources behind per-listing,
per-source TOS gates that require a Google reCAPTCHA token. Without
acceptance, you'll see `(Agreement required)` strings, masked MLS numbers
(`*********`), and missing dates. **This MCP can't bypass the reCAPTCHA**
— accept the relevant TOS once in your browser for each gated section and
the unlock persists on your account.

History entries you fetch carry a `price_gated: boolean` field so the
caller can detect masked data and prompt accordingly.

## Network capture (when HouseSigma drifts)

The endpoints, salt, and public key may rotate. To refresh:

1. Open `https://housesigma.com` in Chrome, sign in.
2. DevTools → Network, filter `bkv2/api`.
3. Reproduce the failing action.
4. For path changes, update `src/housesigma/endpoints.ts`.
5. For salt / public key changes, re-extract from the production bundle
   (`window.Ke.apiSalt`, `window.Ke.pemEncodedKey` — minified to short
   variable names; grep for the literal string).
6. Run with `HOUSESIGMA_DEBUG=1` to log every URL hit.

## Files

```
src/
  index.ts                MCP stdio entry + 5 tool registrations
  config.ts               .env loader
  smoke.ts                CLI smoke-test
  housesigma/
    client.ts             Auth, signing, encryption, normalisers
    endpoints.ts          Endpoint paths + salt + public key
    types.ts              Response types
.mcp.json                 Auto-picked-up Claude Code MCP registration
```

## Known gaps

- Cannot solve the reCAPTCHA-gated TREB TOS — user must do that in-browser.
- `apiSalt`, `HS-Client-Version`, and the RSA public key rotate occasionally.
- No retry/backoff yet. Add if you hit rate limits.
- No tests yet. Fixture-based tests against captured JSON would be the
  cheapest way to add coverage.
