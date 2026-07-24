# Peek-A-Box UCP MCP server

A [FastMCP](https://github.com/jlowin/fastmcp) server implementing the
[Universal Commerce Protocol](https://ucp.dev/specification/checkout-mcp/) (catalog +
checkout + orders) with Descope authentication, plus **MCP UI components** that render
an interactive buying experience in hosts that support them (ChatGPT and Claude).

## Tools

| Tool | Capability | Scope | Widget |
| --- | --- | --- | --- |
| `lookup_catalog` | catalog | public | Catalog grid |
| `get_product` | catalog | public | — |
| `create_checkout` | checkout | `checkout:manage` | Checkout review |
| `get_checkout` | checkout | `checkout:manage` | Checkout review |
| `update_checkout` | checkout | `checkout:manage` | Checkout review |
| `complete_checkout` | checkout | `checkout:manage` | Order confirmation |
| `cancel_checkout` | checkout | `checkout:manage` | — |
| `get_orders` | order | `order:read` | — |

## MCP UI components

The catalog, checkout, and order-confirmation widgets are self-contained inline HTML
served from `ui://` resources (see [`widgets.py`](widgets.py)). One implementation
serves **both** ecosystems:

- **Claude / MCP Apps (SEP-1865)** — this takes **two** registrations per widget (both
  done by `register_widgets()`), using FastMCP `fastmcp.apps`:
  1. The view is registered as a resource — `@mcp.resource("ui://…", app=AppConfig())` —
     which serves it as `text/html;profile=mcp-app` **and advertises the
     `io.modelcontextprotocol/ui` capability at `initialize`** (the negotiation Claude
     requires before it will render a `ui://` resource). A bare `AppConfig()` here is what
     marks the resource as an MCP Apps view; miss it and the `ui://` resource ships without
     its MCP Apps MIME/metadata.
  2. The widget tool declares `@mcp.tool(app=AppConfig(resource_uri="ui://…"))`, which only
     sets `_meta.ui.resourceUri` to point at that view — it does not itself serve the view.
- **ChatGPT (OpenAI Apps SDK)** — the same tool also carries `_meta["openai/outputTemplate"]`
  pointing at a **separate** `text/html+skybridge` resource variant, read via
  `window.openai.toolOutput`.

`register_widgets(mcp)` in `widgets.py` wires both resource variants and both `_meta` keys
for every widget — the one place to add or change a widget.

A small self-contained in-widget bridge (`window.PAB`) normalizes the two host APIs — it
reads `window.openai` (ChatGPT) or the MCP Apps `ui/notifications/tool-result` postMessage
(Claude) — so the same HTML renders, themes (light/dark), and wires buttons on both, with
no external SDK/CDN.

The widgets mirror the storefront's design (see `components/product-card.tsx` and
`app/styles/globals.css`): the box-logo + `#number` tile, dark foreground-pill badges,
italic descriptions, `tabular-nums` prices, and the cart's order-summary rows. Because
the sandboxed iframe can't reach the app's font pipeline, Geist is embedded (subsetted)
in `_fonts.py` — regenerate it with `python scripts/subset_fonts.py` after `npm install`.

## Run locally

Requires **Python ≥ 3.10** (FastMCP v3).

```bash
cd mcp_server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in DESCOPE_CONFIG_URL (see below)
python server.py              # serves MCP on http://localhost:8000/mcp
```

Per-tool OAuth scopes are enforced with `require_scopes(...)` on each tool: the catalog
tools are open, while the checkout tools require `dev.ucp.shopping.checkout:manage` and
`get_orders` requires `dev.ucp.shopping.order:read` — so scoped tools stay hidden until the
agent completes identity linking.

`DESCOPE_CONFIG_URL` comes from **Descope Console → MCP Servers → your server →
Well-Known URL**. `STRIPE_SECRET_KEY` and `DATABASE_URL` are optional — without them the
server simulates charges and stores state in memory.

The Next.js app proxies `/mcp` → this server (`MCP_SERVER_URL`, default
`http://localhost:8000`), so agents connect to the storefront's public `/mcp` endpoint.

## Verify

Protocol + widget rendering are covered without a live Descope project:

```bash
cd mcp_server && source .venv/bin/activate
python test_server.py   # 41 checks: tool _meta, ui:// resources, storefront parity, buying flow
```

To view the widgets in a browser without a running MCP host, render them with a mock
`window.openai` (sample `toolOutput` + stubbed callbacks) injected:

```bash
python scripts/preview_widgets.py                       # writes ./widget-preview/*.html
python -m http.server --directory widget-preview 8901
# open http://localhost:8901/catalog.light.html  (also checkout.*, confirmation.*, .dark)
```

Each page logs `callTool` / `sendFollowUpMessage` / `openExternal` to the console, so the
button callbacks are observable in both light and dark themes.

### Live in-client test

A true end-to-end render requires a live Descope project connected to a host:

1. Run this server with a real `DESCOPE_CONFIG_URL` and expose it publicly (e.g. the
   Next.js proxy at `https://<your-domain>/mcp`).
2. **ChatGPT** — Settings → Connectors → add your `/mcp` URL, complete the OAuth
   (identity-linking) flow, then ask *"show me the Peek-A-Box catalog"*.
3. **Claude** — add the MCP server (Settings → Connectors / `claude mcp add`), authorize,
   then ask the same. Widgets render inline; buying actions call back through the host.

> Note: MCP Apps rendering in Claude is still maturing
> ([ext-apps#671](https://github.com/modelcontextprotocol/ext-apps/issues/671)). The
> MCP Inspector and the `@modelcontextprotocol/ext-apps` `basic-host` are reliable
> ground-truth harnesses if a widget doesn't render in a given client build.
