"""Offline protocol test for the Peek-A-Box UCP MCP server (FastMCP v3).

Runs without a live Descope project or network: it stubs DescopeProvider and
mocks the access token, then checks the wire contract the UI hosts (ChatGPT,
Claude) consume.

    cd mcp_server && source .venv/bin/activate && python test_server.py

Covers: the MCP Apps UI capability at initialize (what Claude negotiates before
rendering), per-tool widget `_meta` for both platforms, the `ui://` resources and
mimetypes, catalog/storefront parity, per-tool scope gating (require_scopes), and
the full buying flow (create -> get -> update -> complete -> orders).

Note on auth: scope enforcement is done by `require_scopes(...)` at the tool-call
layer, so an unauthenticated client can't see or call the scoped tools. We assert
that gating via the in-memory Client, and exercise the tools' business logic by
calling the module functions directly (which run below the transport auth check)
with a mocked access token.
"""
import asyncio
import base64
import importlib.util
import json
import os
import sys

os.environ.setdefault("DESCOPE_CONFIG_URL", "https://example.invalid/.well-known/openid-configuration")
os.environ.setdefault("BASE_URL", "http://localhost:3000")

# Stub DescopeProvider so importing the server needs no network / real project.
import fastmcp.server.auth.providers.descope as _descope_mod
from fastmcp.server.auth.auth import AuthProvider


class _FakeDescope(AuthProvider):
    def __init__(self, *a, **k):
        super().__init__()

    def get_routes(self, *a, **k):
        return []

    async def verify_token(self, token):
        return None


_descope_mod.DescopeProvider = _FakeDescope

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
_spec = importlib.util.spec_from_file_location("server", os.path.join(_HERE, "server.py"))
server = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(server)

from fastmcp import Client  # noqa: E402


def _fake_token(scopes, sub="user_123", email="ada@example.com", name="Ada Lovelace"):
    payload = {"scope": " ".join(scopes), "sub": sub, "email": email, "name": name}
    b = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return "h." + b + ".s"


class _FakeAccess:
    def __init__(self, token):
        self.token = token


def _authorize(scopes):
    """Make server.get_access_token() return a token with the given scopes."""
    server.get_access_token = lambda: _FakeAccess(_fake_token(scopes))


_ok = []


def check(label, cond, extra=""):
    _ok.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + label + ("" if cond else "  << " + str(extra)))


async def main():
    WIDGET_TOOLS = {
        "lookup_catalog": "catalog", "create_checkout": "checkout",
        "get_checkout": "checkout", "update_checkout": "checkout",
        "complete_checkout": "confirmation",
    }
    NON_WIDGET = ("get_product", "get_orders", "cancel_checkout")

    async with Client(server.mcp) as client:
        # 1) MCP Apps UI capability advertised at initialize (Claude negotiates this).
        caps = client.initialize_result.capabilities.model_dump()
        exts = caps.get("extensions") or {}
        check("initialize advertises io.modelcontextprotocol/ui", "io.modelcontextprotocol/ui" in exts, caps)

        # 2) scoped tools are gated for an unauthenticated client.
        visible = {t.name for t in await client.list_tools()}
        check("unauth client sees catalog tools", {"lookup_catalog", "get_product"} <= visible, visible)
        check("unauth client cannot see create_checkout", "create_checkout" not in visible, visible)
        check("unauth client cannot see get_orders", "get_orders" not in visible, visible)

        # 3) resources (both mimetype variants per widget) + self-contained HTML.
        res = {str(r.uri): r for r in await client.list_resources()}
        for wkey in ("catalog", "checkout", "confirmation"):
            sky, app = f"ui://widget/{wkey}.html", f"ui://widget/{wkey}.mcp-app.html"
            check(f"{wkey} skybridge mime", res.get(sky) and res[sky].mimeType == "text/html+skybridge")
            check(f"{wkey} mcp-app mime", res.get(app) and res[app].mimeType == "text/html;profile=mcp-app")
            html = (await client.read_resource(app))[0].text
            check(f"{wkey} self-contained html",
                  "window.PAB" in html and "<!doctype html>" in html and "openai:set_globals" in html)

        # 4) catalog — "what boxes can I buy?" lists all 9, and mirrors the
        #    storefront (lib/products.ts): box-π at $31.41.
        full = await client.call_tool("lookup_catalog", {"limit": 50})
        check("catalog lists all 9 boxes", full.structured_content.get("total") == 9, full.structured_content.get("total"))
        prem = await client.call_tool("lookup_catalog", {"category": "premium"})
        ids = {i["id"]: i for i in prem.structured_content["items"]}
        check("catalog has box-π", "box-π" in ids, list(ids))
        check("box-π price = 3141 cents", ids.get("box-π", {}).get("price") == 3141, ids.get("box-π"))
        check("box-π description matches storefront",
              ids.get("box-π", {}).get("description") == "Never Ends. Neither Will Your Curiosity.")

    # 5) per-tool widget _meta for BOTH platforms (unfiltered registry).
    all_tools = {t.name: t for t in await server.mcp._list_tools()}
    check("all 8 tools registered", set(all_tools) == {
        "lookup_catalog", "get_product", "create_checkout", "get_checkout",
        "update_checkout", "complete_checkout", "cancel_checkout", "get_orders"}, sorted(all_tools))
    for tname, wkey in WIDGET_TOOLS.items():
        m = all_tools[tname].meta or {}
        check(f"{tname} openai/outputTemplate", m.get("openai/outputTemplate") == f"ui://widget/{wkey}.html", m)
        check(f"{tname} ui.resourceUri", (m.get("ui") or {}).get("resourceUri") == f"ui://widget/{wkey}.mcp-app.html", m)
    for tname in NON_WIDGET:
        check(f"{tname} has no widget", "openai/outputTemplate" not in (all_tools[tname].meta or {}))

    # 6) buying-flow business logic — direct calls with a mocked scoped token.
    _authorize(["dev.ucp.shopping.checkout:manage", "dev.ucp.shopping.order:read"])

    c = server.create_checkout(line_items=[{"id": "li_1", "item": {"id": "box-42"}, "quantity": 1}])
    cid = c["id"]
    check("create_checkout does NOT charge (status incomplete)", c.get("status") == "incomplete", c.get("status"))
    check("create_checkout returns the review link (continue_url)",
          isinstance(c.get("continue_url"), str) and ("/cart?session=" + cid) in c["continue_url"], c.get("continue_url"))
    check("buyer auto-filled from identity claims", (c.get("buyer") or {}).get("email") == "ada@example.com", c.get("buyer"))
    check("total = 4200", any(t["type"] == "total" and t["amount"] == 4200 for t in c["totals"]), c["totals"])

    g = server.get_checkout(id=cid)
    check("get_checkout round-trips id", g.get("id") == cid)

    u = server.update_checkout(id=cid, line_items=[{"id": "li_1", "item": {"id": "box-67"}, "quantity": 1}])
    check("update_checkout recomputes total = 6700",
          any(t["type"] == "total" and t["amount"] == 6700 for t in u["totals"]))

    comp = server.complete_checkout(id=cid, idempotency_key="idem-1")
    check("complete_checkout completed", comp.get("status") == "completed", comp.get("status"))
    check("order id present", (comp.get("order") or {}).get("id", "").startswith("order_"), comp.get("order"))
    check("payment simulated (no stripe key)", (comp.get("payment") or {}).get("simulated") is True, comp.get("payment"))

    orders = server.get_orders()
    check("get_orders returns the placed order", orders.get("total", 0) >= 1)

    c2 = server.create_checkout(line_items=[{"id": "li_1", "item": {"id": "box-42"}, "quantity": 2}])
    comp2 = server.complete_checkout(id=c2["id"], idempotency_key="idem-2")
    check("multi-item complete -> requires_action", comp2.get("status") == "requires_action", comp2.get("status"))
    check("multi-item hands off with the browser link", isinstance(comp2.get("continue_url"), str), comp2.get("continue_url"))

    print(f"\n{sum(_ok)}/{len(_ok)} checks passed")
    return 0 if all(_ok) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
