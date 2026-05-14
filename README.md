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
| `get_listing_history` | All prior MLS records for a property — list dates, end dates, status (Sold/Terminated/Expired), price changes, days on market. |
| `get_comparables` | HouseSigma's sold/active comparables for an `id_listing`. |
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
# OR, if email/password login fails (e.g. captcha / 2FA / signing changes),
# paste a live token captured from your browser:
HOUSESIGMA_TOKEN=eyJ...
```

Smoke-test:

```bash
node dist/smoke.js "35 Jonathan Street Uxbridge"
```

If you get `HouseSigmaError` with HTTP 401/403 or `status: false`, the
endpoint shape has drifted — see [Network capture](#network-capture) below.

## Install into Claude Code

`~/.config/claude-code/mcp.json` (or your project's `.mcp.json`):

```json
{
  "mcpServers": {
    "housesigma": {
      "command": "node",
      "args": ["/absolute/path/to/restoration-pm/dist/index.js"],
      "env": {
        "HOUSESIGMA_EMAIL": "you@example.com",
        "HOUSESIGMA_PASSWORD": "..."
      }
    }
  }
}
```

Or, equivalently, from the Claude Code CLI:

```bash
claude mcp add housesigma \
  -- node /absolute/path/to/restoration-pm/dist/index.js
```

Restart Claude Code. The tools appear as `mcp__housesigma__search_address`,
`mcp__housesigma__get_listing_history`, etc.

## Install into Codex CLI

Codex reads MCP servers from `~/.codex/config.toml`:

```toml
[mcp_servers.housesigma]
command = "node"
args = ["/absolute/path/to/restoration-pm/dist/index.js"]

[mcp_servers.housesigma.env]
HOUSESIGMA_EMAIL = "you@example.com"
HOUSESIGMA_PASSWORD = "..."
```

Then in any Codex session:

```
/mcp
```

…should list `housesigma` as connected.

## Network capture

When HouseSigma changes a request shape (eventually they will), here is how
to update the client without guessing.

1. Open `https://housesigma.com` in Chrome and log in.
2. Open **DevTools → Network**, filter `bkv2/api`.
3. Reproduce the action you want to fix:
   - Searching an address triggers `…/api/search/address`
   - Opening a listing triggers `…/api/listing/info` and `…/api/listing/history`
   - The comparables panel triggers `…/api/listing/comparables`
4. For each relevant request:
   - Right-click → **Copy → Copy as cURL (bash)**
   - Note the path (after `bkv2/api/...`), query parameters, and the
     `Authorization: Bearer …` header value.
5. Update `src/housesigma/endpoints.ts` if the path changed, and/or paste
   the bearer token into `.env` as `HOUSESIGMA_TOKEN` to skip the login flow.
6. If the response JSON shape changed, update the `normalise*` functions in
   `src/housesigma/client.ts`. The `raw` field is always included so the
   model can fall back to the unparsed payload.

To dump a full request/response while developing, run with
`HOUSESIGMA_DEBUG=1`.

## Files

```
src/
  index.ts              MCP stdio entrypoint, tool registrations
  config.ts             .env loader
  smoke.ts              CLI smoke-test (no MCP)
  housesigma/
    client.ts           HTTP client + response normalisers
    endpoints.ts        Endpoint path catalog
    types.ts            Response types
```

## Known gaps

- Login may fail if HouseSigma adds request signing / captcha; fall back to
  `HOUSESIGMA_TOKEN` from a browser capture.
- Response normalisers cover the fields commonly observed in 2024–2026
  traffic; uncommon fields fall through to `raw`.
- No retry/backoff yet. Add if you hit rate limits.
- No tests yet — the data source is private; a fixture-based test suite
  using captured JSON would be the way to add coverage.
