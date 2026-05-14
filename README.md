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
git clone <this repo> ~/.local/share/housesigma-mcp   # any permanent path is fine
cd ~/.local/share/housesigma-mcp
npm install
npm run build
```

Create a `.env`. The MCP looks for one in (highest priority first):

1. `$HOUSESIGMA_ENV_FILE`
2. `$PWD/.env`
3. `<repo>/.env`             ← simplest: drop it here
4. `~/.config/housesigma-mcp/.env`
5. `~/.housesigma-mcp/.env`

```env
HOUSESIGMA_EMAIL=you@example.com
HOUSESIGMA_PASSWORD=...
# OR, if you'd rather paste a bearer token from a logged-in browser session:
HOUSESIGMA_TOKEN=eyJ...
```

Smoke-test:

```bash
node dist/smoke.js "35 Jonathan Street Uxbridge"
```

## Persistent install — works from anywhere

### Claude Code (recommended: user scope)

```bash
claude mcp add --scope user housesigma \
  node /absolute/path/to/housesigma-mcp/dist/index.js
```

This writes to `~/.claude.json` so the MCP is available in **every** Claude
Code session, regardless of which project directory you're in. Verify:

```bash
claude mcp list
# housesigma: node /abs/path/dist/index.js - ✓ Connected
```

To remove later: `claude mcp remove housesigma -s user`.

### Codex CLI

Edit `~/.codex/config.toml`:

```toml
[mcp_servers.housesigma]
command = "node"
args = ["/absolute/path/to/housesigma-mcp/dist/index.js"]
```

Then `/mcp` in any Codex session should list `housesigma` as connected.

### Project-scope alternative (for developing the MCP itself)

If you're editing the MCP source and want a Claude Code session inside the
repo to use *that* working copy, add a `.mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "housesigma": { "command": "node", "args": ["./dist/index.js"] }
  }
}
```

Project scope takes precedence over user scope when both are present, so
this is the right setup for development.

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
per-section TOS gates. The frontend's gate is invisible Google reCAPTCHA
v3 — site key `6Lc82-MZAAAAALRrYvLZl3nGEmpEKJNiWy8ep5WP`, action `tos` —
and the server **does** validate the token (empty / forged tokens return
`Verification failed`). Acceptance persists on the account once granted,
but each section of each listing may need its own click-through.

**This MCP cannot bypass the reCAPTCHA.** When data comes back masked
(`(Agreement required)` strings, MLS numbers like `*********`), open the
listing in your browser, click the blurred section, and accept the popup.
Subsequent MCP calls will return un-masked data.

History entries carry a `price_gated: boolean` field so callers can
detect masked data and prompt accordingly.

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
