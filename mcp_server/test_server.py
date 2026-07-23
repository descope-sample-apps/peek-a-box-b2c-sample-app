"""Offline protocol test for the Peek-A-Box UCP MCP server.

Runs without a live Descope project or network: it stubs DescopeProvider and
mocks the access token, then drives the tools through FastMCP's in-memory
client to check the wire contract the UI hosts (ChatGPT, Claude) consume.

    cd mcp_server && source .venv/bin/activate && python test_server.py

Covers: per-tool widget `_meta` (both platforms), the `ui://` resources and
their mimetypes, catalog/storefront parity, and the full authenticated buying
flow (create -> get -> update -> complete -> orders) incl. scope enforcement.
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


_ok = []


def check(label, cond, extra=""):
    _ok.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + label + ("" if cond else "  << " + str(extra)))


async def main():
    async with Client(server.mcp) as client:
        tools = {t.name: t for t in await client.list_tools()}

        widget_map = {
            "lookup_catalog": "catalog", "create_checkout": "checkout",
            "get_checkout": "checkout", "update_checkout": "checkout",
            "complete_checkout": "confirmation",
        }
        for tname, wkey in widget_map.items():
            m = tools[tname].meta or {}
            check(f"{tname} openai/outputTemplate", m.get("openai/outputTemplate") == f"ui://widget/{wkey}.html", m)
            check(f"{tname} ui.resourceUri", (m.get("ui") or {}).get("resourceUri") == f"ui://widget/{wkey}.mcp-app.html", m)
            check(f"{tname} widgetAccessible", m.get("openai/widgetAccessible") is True, m)
        for tname in ("get_product", "get_orders", "cancel_checkout"):
            check(f"{tname} has no widget", "openai/outputTemplate" not in (tools[tname].meta or {}))

        res = {str(r.uri): r for r in await client.list_resources()}
        for wkey in ("catalog", "checkout", "confirmation"):
            sky, app = f"ui://widget/{wkey}.html", f"ui://widget/{wkey}.mcp-app.html"
            check(f"{wkey} skybridge mime", res.get(sky) and res[sky].mimeType == "text/html+skybridge")
            check(f"{wkey} mcp-app mime", res.get(app) and res[app].mimeType == "text/html;profile=mcp-app")
            html = (await client.read_resource(sky))[0].text
            check(f"{wkey} self-contained html",
                  "window.PAB" in html and "<!doctype html>" in html and "openai:set_globals" in html)

        # Catalog mirrors the storefront (lib/products.ts) — box-π at $31.41.
        prem = await client.call_tool("lookup_catalog", {"category": "premium"})
        ids = {i["id"]: i for i in prem.structured_content["items"]}
        check("catalog has box-π", "box-π" in ids, list(ids))
        check("box-π price = 3141 cents", ids.get("box-π", {}).get("price") == 3141, ids.get("box-π"))
        check("box-π description matches storefront",
              ids.get("box-π", {}).get("description") == "Never Ends. Neither Will Your Curiosity.")

        # Authenticated buying flow.
        server.get_access_token = lambda: _FakeAccess(
            _fake_token(["dev.ucp.shopping.checkout:manage", "dev.ucp.shopping.order:read"]))

        cr = await client.call_tool("create_checkout",
            {"line_items": [{"id": "li_1", "item": {"id": "box-42"}, "quantity": 1}]})
        c = cr.structured_content
        cid = c["id"]
        check("create_checkout incomplete", c.get("status") == "incomplete", c.get("status"))
        check("buyer auto-filled from identity claims", (c.get("buyer") or {}).get("email") == "ada@example.com", c.get("buyer"))
        check("total = 4200", any(t["type"] == "total" and t["amount"] == 4200 for t in c["totals"]), c["totals"])

        gr = await client.call_tool("get_checkout", {"id": cid})
        check("get_checkout round-trips id", gr.structured_content.get("id") == cid)

        ur = await client.call_tool("update_checkout",
            {"id": cid, "line_items": [{"id": "li_1", "item": {"id": "box-67"}, "quantity": 1}]})
        check("update_checkout recomputes total = 6700",
              any(t["type"] == "total" and t["amount"] == 6700 for t in ur.structured_content["totals"]))

        comp = await client.call_tool("complete_checkout", {"id": cid, "idempotency_key": "idem-1"})
        cc = comp.structured_content
        check("complete_checkout completed", cc.get("status") == "completed", cc.get("status"))
        check("order id present", (cc.get("order") or {}).get("id", "").startswith("order_"), cc.get("order"))
        check("payment simulated (no stripe key)", (cc.get("payment") or {}).get("simulated") is True, cc.get("payment"))

        orders = await client.call_tool("get_orders", {})
        check("get_orders returns placed order", orders.structured_content.get("total", 0) >= 1)

        cr2 = await client.call_tool("create_checkout",
            {"line_items": [{"id": "li_1", "item": {"id": "box-42"}, "quantity": 2}]})
        comp2 = await client.call_tool("complete_checkout",
            {"id": cr2.structured_content["id"], "idempotency_key": "idem-2"})
        check("multi-item complete -> requires_action",
              comp2.structured_content.get("status") == "requires_action", comp2.structured_content.get("status"))

        # No token -> scope guard blocks the mutation.
        server.get_access_token = lambda: None
        errc = await client.call_tool("create_checkout",
            {"line_items": [{"id": "li_1", "item": {"id": "box-42"}, "quantity": 1}]})
        data = errc.structured_content or {}
        check("no-scope create_checkout blocked",
              data.get("error") == "insufficient_scope"
              or any(m.get("code") == "insufficient_scope" for m in data.get("messages", [])), data)

    print(f"\n{sum(_ok)}/{len(_ok)} checks passed")
    return 0 if all(_ok) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
