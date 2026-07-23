"""Render the widgets to standalone HTML files for local visual inspection.

The widgets normally read their data from the host bridge (`window.openai` in
ChatGPT, or postMessage in MCP Apps). This script writes each widget out with a
mock `window.openai` injected — sample `toolOutput`, `theme`, and stubbed
`callTool` / `sendFollowUpMessage` / `openExternal` that log to the console — so
you can open them in any browser (light + dark) without a running MCP host.

Usage (from mcp_server/, no server or auth needed):
    python scripts/preview_widgets.py            # writes ./widget-preview/*.html
    python scripts/preview_widgets.py OUT_DIR    # custom output dir
    python -m http.server --directory widget-preview 8901
    # then open http://localhost:8901/catalog.light.html  (etc.)
"""
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import widgets  # noqa: E402

# Sample tool outputs (shape matches what the server's tools return).
SAMPLES = {
    "catalog": {
        "ucp": {"version": "2026-04-08"},
        "items": [
            {"id": "box-42", "title": "Box #42", "description": "The Answer To Everything", "price": 4200, "currency": "USD", "category": "premium"},
            {"id": "box-67", "title": "Box #67", "description": "This Makes Our CEO Laugh", "price": 6700, "currency": "USD", "category": "premium", "badge": "CEO Pick"},
            {"id": "box-π", "title": "Box #π", "description": "Never Ends. Neither Will Your Curiosity.", "price": 3141, "currency": "USD", "category": "premium"},
            {"id": "box-666", "title": "Box #666", "description": "Legally We Cannot Discuss This", "price": 666, "currency": "USD", "category": "new"},
        ],
        "total": 4,
    },
    "checkout": {
        "ucp": {"version": "2026-04-08"},
        "id": "checkout_123", "status": "incomplete", "currency": "USD",
        "buyer": {"name": "Ada Lovelace", "email": "ada@example.com"},
        "line_items": [{"id": "li_1", "item": {"id": "box-42", "title": "Box #42", "price": 4200}, "quantity": 1}],
        "totals": [{"type": "subtotal", "amount": 4200}, {"type": "total", "amount": 4200}],
        "continue_url": "http://localhost:3000/cart?session=checkout_123",
    },
    "confirmation": {
        "ucp": {"version": "2026-04-08"},
        "id": "checkout_123", "status": "completed", "currency": "USD",
        "totals": [{"type": "subtotal", "amount": 4200}, {"type": "total", "amount": 4200}],
        "payment": {"status": "captured", "simulated": True},
        "order": {"id": "order_123", "permalink_url": "http://localhost:3000/cart/confirm?session=checkout_123"},
        "buyer": {"name": "Ada Lovelace", "email": "ada@example.com"},
    },
}

MOCK = """
<script>
window.__calls = [];
window.openai = {
  toolOutput: %s,
  theme: '%s',
  displayMode: 'inline',
  callTool: function(n,a){ window.__calls.push(['callTool',n,a]); console.log('callTool', n, a); return Promise.resolve({result:'ok'}); },
  sendFollowUpMessage: function(o){ window.__calls.push(['sendPrompt',o.prompt]); console.log('sendFollowUpMessage', o.prompt); return Promise.resolve(); },
  openExternal: function(o){ window.__calls.push(['openLink',o.href]); console.log('openExternal', o.href); }
};
</script>
"""


def main() -> None:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "widget-preview"
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for key, data in SAMPLES.items():
        for theme in ("light", "dark"):
            html = widgets.WIDGETS[key]["html"]
            html = html.replace("<head>", "<head>" + (MOCK % (json.dumps(data), theme)), 1)
            bg = "#faf7f2" if theme == "light" else "#221f1c"
            html = html.replace("<body>", f'<body style="background:{bg}">', 1)
            fn = os.path.join(out_dir, f"{key}.{theme}.html")
            with open(fn, "w", encoding="utf-8") as f:
                f.write(html)
            written.append(fn)
    print("Wrote:\n  " + "\n  ".join(written))
    print(f"\nServe them:\n  python -m http.server --directory {out_dir} 8901")
    print("  open http://localhost:8901/catalog.light.html")


if __name__ == "__main__":
    main()
