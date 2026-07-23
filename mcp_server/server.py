"""
Peek-A-Box UCP MCP Server
Implements the Universal Commerce Protocol (UCP) checkout + catalog capabilities
via FastMCP with Descope authentication.

Spec: https://ucp.dev/specification/checkout-mcp/
"""

import base64
import json as _json
import os
import time
import uuid
from typing import Optional

from starlette.types import ASGIApp, Receive, Scope as ASGIScope, Send

from dotenv import load_dotenv
from fastmcp import FastMCP
from fastmcp.server.auth.providers.descope import DescopeProvider
from fastmcp.server.dependencies import get_access_token
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse

import widgets

load_dotenv()

UCP_VERSION = "2026-04-08"
BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")
MCP_PORT = int(os.environ.get("MCP_PORT", "8000"))

_CHECKOUT_SCOPE = "dev.ucp.shopping.checkout:manage"
_ORDER_READ_SCOPE = "dev.ucp.shopping.order:read"

# ── Stripe payment handler ────────────────────────────────────────────────────
# UCP keeps payment separate from checkout, so Stripe plugs in as a payment
# handler: the agent submits a tokenized card and Peek-A-Box (merchant of record)
# charges it server-side. When STRIPE_SECRET_KEY is unset the charge is simulated
# so the demo still runs without a Stripe account.
STRIPE_PAYMENT_HANDLER_ID = "com.stripe.payment"
_stripe = None
try:
    _stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
    if _stripe_key:
        import stripe as _stripe_sdk
        _stripe_sdk.api_key = _stripe_key
        _stripe = _stripe_sdk
except Exception:
    _stripe = None

# ── Auth ──────────────────────────────────────────────────────────────────────

auth = DescopeProvider(
    config_url=os.environ["DESCOPE_CONFIG_URL"],
    base_url=os.environ.get("MCP_BASE_URL", f"http://localhost:{MCP_PORT}"),
)

mcp = FastMCP(
    name="peek-a-box-ucp",
    instructions=(
        "You are connected to the Peek-A-Box mystery box store. "
        "Use the catalog tools to search products and the checkout tools "
        "to create and manage checkout sessions on behalf of users."
    ),
    auth=auth,
)

# ── Product catalog (mirrors lib/products.ts) ─────────────────────────────────

PRODUCTS = [
    {"id": "box-14291", "name": "Box #14291", "description": "Mildly Concerning",             "price": 9.99,  "category": "bestsellers", "badge": "Bestseller"},
    {"id": "box-50003", "name": "Box #50003", "description": "Definitely Haunted",            "price": 13.99, "category": "new",         "badge": None},
    {"id": "box-7",     "name": "Box #7",     "description": "Suspiciously Light",            "price": 7.77,  "category": "bestsellers", "badge": None},
    {"id": "box-666",   "name": "Box #666",   "description": "Legally We Cannot Discuss This","price": 6.66,  "category": "new",         "badge": None},
    {"id": "box-42",    "name": "Box #42",    "description": "The Answer To Everything",      "price": 42.00, "category": "premium",     "badge": None},
    {"id": "box-99999", "name": "Box #99999", "description": "Too Many Nines",                "price": 9.99,  "category": "bestsellers", "badge": None},
    {"id": "box-67",    "name": "Box #67",    "description": "This Makes Our CEO Laugh",      "price": 67.00, "category": "premium",     "badge": "CEO Pick"},
    {"id": "box-0",     "name": "Box #0",     "description": "The First One. Or Is It?",      "price": 0.01,  "category": "new",         "badge": None},
    {"id": "box-π",     "name": "Box #π",     "description": "Never Ends. Neither Will Your Curiosity.", "price": 31.41, "category": "premium",     "badge": None},
]

def _to_ucp_item(p: dict) -> dict:
    item = {
        "id": p["id"],
        "title": p["name"],
        "description": p["description"],
        "price": round(p["price"] * 100),  # cents
        "currency": "USD",
        "images": [{"url": f"{BASE_URL}/placeholder.svg?height=400&width=400", "alt": p["name"]}],
        "category": p["category"],
        "available": True,
    }
    if p.get("badge"):
        item["badge"] = p["badge"]
    return item

# ── Auth helpers ─────────────────────────────────────────────────────────────

def _decode_jwt_claims(token: str) -> dict:
    """Decode claims from a JWT payload without signature verification.

    The token has already been cryptographically verified by DescopeProvider
    before any tool is invoked. We only read claims here.
    """
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        return _json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        return {}


def _get_token_scopes() -> set[str]:
    """Return the set of scopes granted in the current access token."""
    try:
        access_token = get_access_token()
        if access_token and access_token.token:
            claims = _decode_jwt_claims(access_token.token)
            scope_str = claims.get("scope", "") or ""
            return set(scope_str.split())
    except Exception:
        pass
    return set()


def _require_scope(scope: str) -> dict | None:
    """Return a structured error dict if the required scope is not present, else None.
    """
    if scope not in _get_token_scopes():
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "error": "insufficient_scope",
            "required_scopes": [scope],
            "error_description": f"The '{scope}' scope is required for this action",
        }
    return None


def _current_user_sub() -> Optional[str]:
    """Return the 'sub' (user id) from the current access token, if linked."""
    try:
        access_token = get_access_token()
        if access_token and access_token.token:
            return _decode_jwt_claims(access_token.token).get("sub") or None
    except Exception:
        pass
    return None


# ── Persistence (Render Postgres, with in-memory fallback) ────────────────────
# Checkouts and orders persist to Postgres when DATABASE_URL is set (e.g. a
# Render Postgres instance); otherwise they fall back to in-memory dicts so the
# demo still runs with zero config
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# In-memory fallback (used when DATABASE_URL is unset or Postgres is unavailable).
_checkouts: dict[str, dict] = {}
_orders_by_user: dict[str, list[dict]] = {}

try:
    from psycopg_pool import ConnectionPool as _ConnectionPool
    from psycopg.types.json import Jsonb as _Jsonb
except Exception:
    _ConnectionPool = None
    _Jsonb = None

_pool = None
if DATABASE_URL and _ConnectionPool is not None:
    try:
        _pool = _ConnectionPool(DATABASE_URL, min_size=1, max_size=10, open=False)
        _pool.open(wait=True, timeout=10)
        with _pool.connection() as _conn:
            _conn.execute(
                "CREATE TABLE IF NOT EXISTS checkouts ("
                " id TEXT PRIMARY KEY, data JSONB NOT NULL,"
                " updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            )
            _conn.execute(
                "CREATE TABLE IF NOT EXISTS orders ("
                " id TEXT PRIMARY KEY, user_sub TEXT NOT NULL, data JSONB NOT NULL,"
                " created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            )
            _conn.execute(
                "CREATE INDEX IF NOT EXISTS orders_user_sub_idx"
                " ON orders (user_sub, created_at DESC)"
            )
    except Exception as e:
        # Configured DB unreachable: log and fall back to in-memory so the server
        # still starts (a visible signal beats a hard crash for a demo).
        print(f"[peek-a-box] DATABASE_URL set but Postgres init failed: {e!r}; "
              "using in-memory store")
        _pool = None


def _save_checkout(checkout: dict) -> None:
    """Insert or update a checkout session, keyed by its id."""
    if _pool is None:
        _checkouts[checkout["id"]] = checkout
        return
    with _pool.connection() as conn:
        conn.execute(
            "INSERT INTO checkouts (id, data, updated_at) VALUES (%s, %s, now()) "
            "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
            (checkout["id"], _Jsonb(checkout)),
        )


def _load_checkout(checkout_id: str) -> Optional[dict]:
    """Load a checkout session by id, or None if it doesn't exist."""
    if _pool is None:
        return _checkouts.get(checkout_id)
    with _pool.connection() as conn:
        row = conn.execute(
            "SELECT data FROM checkouts WHERE id = %s", (checkout_id,)
        ).fetchone()
        return row[0] if row else None


def _add_order(user_sub: str, order: dict) -> None:
    """Record an order for a user (idempotent on order id)."""
    if _pool is None:
        _orders_by_user.setdefault(user_sub, []).append(order)
        return
    with _pool.connection() as conn:
        conn.execute(
            "INSERT INTO orders (id, user_sub, data) VALUES (%s, %s, %s) "
            "ON CONFLICT (id) DO NOTHING",
            (order["id"], user_sub, _Jsonb(order)),
        )


def _load_orders(user_sub: str) -> list[dict]:
    """Return a user's orders, most recent first."""
    if _pool is None:
        return list(reversed(_orders_by_user.get(user_sub, [])))
    with _pool.connection() as conn:
        rows = conn.execute(
            "SELECT data FROM orders WHERE user_sub = %s ORDER BY created_at DESC",
            (user_sub,),
        ).fetchall()
        return [r[0] for r in rows]

def _compute_totals(line_items: list[dict], has_shipping: bool) -> list[dict]:
    subtotal = 0
    for li in line_items:
        product = next((p for p in PRODUCTS if p["id"] == li["item"]["id"]), None)
        unit_price = round(product["price"] * 100) if product else li["item"].get("price", 0)
        subtotal += unit_price * li["quantity"]
    shipping = 599 if has_shipping else 0
    totals = [{"type": "subtotal", "amount": subtotal}]
    if shipping:
        totals.append({"type": "fulfillment", "display_text": "Standard Shipping", "amount": shipping})
    totals.append({"type": "total", "amount": subtotal + shipping})
    return totals

def _enrich_line_items(line_items: list[dict]) -> tuple[list[dict], list[dict]]:
    enriched, messages = [], []
    for li in line_items:
        product = next((p for p in PRODUCTS if p["id"] == li["item"]["id"]), None)
        if not product:
            messages.append({
                "type": "error", "code": "item_unavailable",
                "content": f"Item {li['item']['id']} is not available",
                "severity": "unrecoverable",
            })
            enriched.append(li)
        else:
            enriched.append({**li, "item": {"id": product["id"], "title": product["name"], "price": round(product["price"] * 100)}})
    return enriched, messages

def _ucp_envelope() -> dict:
    """Minimal UCP envelope attached to every tool response
    """
    return {"version": UCP_VERSION}

def _select_payment_token(payment: Optional[dict]) -> Optional[str]:
    """Pull a Stripe PaymentMethod / token id from the UCP payment.instruments.

    Prefers an instrument for the Stripe handler (and one marked 'selected'),
    then falls back to any instrument that carries a credential token.
    """
    if not payment:
        return None
    instruments = payment.get("instruments") or []
    ordered = sorted(
        instruments,
        key=lambda i: (i.get("handler_id") != STRIPE_PAYMENT_HANDLER_ID, not i.get("selected")),
    )
    for inst in ordered:
        cred = inst.get("credential") or {}
        token = cred.get("payment_method") or cred.get("token") or cred.get("id")
        if token:
            return token
    return None


def _charge_via_stripe(checkout: dict, payment: Optional[dict], idempotency_key: str) -> dict:
    """Charge the cart total via Stripe as the UCP payment handler.

    The business is the merchant of record: we create + confirm an off-session
    PaymentIntent for the server-computed total (never an agent-supplied amount).
    Returns {"result": "succeeded"|"failed"|"requires_action"|"simulated", ...}.

    Falls back to a simulated capture when Stripe is unconfigured or no payment
    instrument was supplied, so the demo runs without a Stripe account.
    """
    token = _select_payment_token(payment)
    if _stripe is None or not token:
        return {"result": "simulated"}

    amount = next(
        (t.get("amount", 0) for t in checkout.get("totals", []) if t.get("type") == "total"),
        0,
    )
    currency = (checkout.get("currency") or "USD").lower()
    # The buyer email is back-filled from the verified identity-linking claims
    # before this runs; pass it as receipt_email so the charge isn't anonymous.
    buyer_email = (checkout.get("buyer") or {}).get("email")
    create_params = {
        "amount": amount,
        "currency": currency,
        "payment_method": token,
        "confirm": True,
        "off_session": True,
        "metadata": {"checkout_id": checkout["id"], "source": "ucp"},
        "idempotency_key": idempotency_key,
    }
    if buyer_email:
        create_params["receipt_email"] = buyer_email
    try:
        intent = _stripe.PaymentIntent.create(**create_params)
    except Exception as e:  # Stripe raises CardError on decline / auth-required
        return {
            "result": "failed",
            "code": getattr(e, "code", None) or "payment_error",
            "message": getattr(e, "user_message", None) or str(e),
        }

    status = getattr(intent, "status", None)
    pi_id = getattr(intent, "id", None)
    if status == "succeeded":
        return {"result": "succeeded", "payment_intent": pi_id}
    if status in ("requires_action", "requires_confirmation", "requires_payment_method"):
        return {
            "result": "requires_action",
            "payment_intent": pi_id,
            "message": "Payment requires additional authentication (e.g. 3-D Secure).",
        }
    return {"result": "failed", "code": "payment_failed", "message": f"Unexpected payment status: {status}"}


# ── Catalog tools ─────────────────────────────────────────────────────────────

@mcp.tool(
    meta=widgets.widget_meta("catalog"),
    annotations={"readOnlyHint": True, "openWorldHint": False, "destructiveHint": False},
)
def lookup_catalog(
    query: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """
    Search for products in the Peek-A-Box catalog.
    Returns a list of matching items with IDs, prices (in cents), and descriptions.

    Args:
        query: Optional free-text search string matched against name and description.
        category: Filter by category — one of 'bestsellers', 'new', or 'premium'.
        limit: Maximum number of results to return (default 20).
    """
    results = PRODUCTS
    if category:
        results = [p for p in results if p["category"] == category]
    if query:
        q = query.lower()
        results = [p for p in results if q in p["name"].lower() or q in p["description"].lower()]
    results = results[:limit]
    items = [_to_ucp_item(p) for p in results]
    return {"ucp": _ucp_envelope(), "items": items, "total": len(items)}


@mcp.tool()
def get_product(id: str) -> dict:
    """
    Look up a specific product by its ID.

    Args:
        id: The product ID (e.g. 'box-42').
    """
    product = next((p for p in PRODUCTS if p["id"] == id), None)
    if not product:
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "item_unavailable",
                          "content": f"Product '{id}' not found", "severity": "unrecoverable"}],
        }
    return {"ucp": _ucp_envelope(), "item": _to_ucp_item(product)}


# ── Checkout tools ────────────────────────────────────────────────────────────

@mcp.tool(
    meta=widgets.widget_meta("checkout"),
    annotations={"readOnlyHint": False, "openWorldHint": False, "destructiveHint": False},
)
def create_checkout(
    line_items: list[dict],
    currency: str = "USD",
    buyer: Optional[dict] = None,
    fulfillment: Optional[dict] = None,
) -> dict:
    """
    Create a new UCP checkout session.

    Args:
        line_items: List of items to purchase. Each must have:
            - id (str): line item ID (e.g. 'li_1')
            - item.id (str): product ID (e.g. 'box-42')
            - quantity (int): number of units
        currency: ISO 4217 currency code (default 'USD').
        buyer: Optional buyer info with email, first_name, last_name.
        fulfillment: Optional fulfillment with shipping destinations.
    """
    if err := _require_scope(_CHECKOUT_SCOPE):
        return err
    if not line_items:
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "invalid_request",
                          "content": "line_items must not be empty", "severity": "unrecoverable"}],
        }

    enriched, messages = _enrich_line_items(line_items)
    fatal = [m for m in messages if m.get("severity") == "unrecoverable"]
    if len(fatal) == len(line_items):
        return {"ucp": {"version": UCP_VERSION, "status": "error"}, "messages": messages, "continue_url": BASE_URL}

    has_shipping = bool(
        fulfillment and any(
            m.get("type") == "shipping" and m.get("destinations")
            for m in fulfillment.get("methods", [])
        )
    )
    totals = _compute_totals(enriched, has_shipping)

    # If the agent completed the Identity Linking OAuth flow, the token will
    # carry user claims (email, name). Use them to pre-fill buyer info and skip
    # the identity_optional hint — identity is already linked.
    user_claims: dict = {}
    try:
        access_token = get_access_token()
        if access_token and access_token.token:
            user_claims = _decode_jwt_claims(access_token.token)
    except Exception:
        pass

    user_sub: Optional[str] = user_claims.get("sub") or None
    user_email: Optional[str] = user_claims.get("email") or None
    user_name: Optional[str] = (
        user_claims.get("name") or user_claims.get("given_name") or None
    )

    # Auto-populate buyer from Identity Linking claims when not already provided
    if not buyer and (user_email or user_name):
        buyer = {}
        if user_email:
            buyer["email"] = user_email
        if user_name:
            buyer["name"] = user_name

    checkout_id = f"checkout_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

    # Hand-off link to the storefront. The user signs in to Peek-A-Box normally
    # to review and place the order — the agent's delegated token authorizes the
    # MCP calls, not the storefront browser session.
    continue_url = f"{BASE_URL}/cart?session={checkout_id}"

    checkout = {
        "id": checkout_id,
        "status": "incomplete",
        "buyer": buyer,
        "line_items": enriched,
        "currency": currency,
        "totals": totals,
        "fulfillment": fulfillment,
        "links": [
            {"type": "privacy_policy",  "url": f"{BASE_URL}/privacy"},
            {"type": "terms_of_service","url": f"{BASE_URL}/terms"},
        ],
        "continue_url": continue_url,
        "expires_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 1800)),
    }
    # Suggest Identity Linking only when the agent hasn't done it yet.
    # Use sub as the signal — it's present in any user-authenticated token.
    if not user_sub:
        messages.append({
            "type": "info",
            "code": "identity_optional",
            "content": (
                "Link user identity to pre-fill saved addresses, apply member pricing, "
                "and access order history."
            ),
        })
    if messages:
        checkout["messages"] = messages
    _save_checkout(checkout)
    return {"ucp": _ucp_envelope(), **checkout}


def _get_checkout_response(id: str) -> dict:
    checkout = _load_checkout(id)
    if not checkout:
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "not_found",
                          "content": f"Checkout '{id}' not found", "severity": "unrecoverable"}],
        }
    public = {k: v for k, v in checkout.items() if not k.startswith("_")}
    return {"ucp": _ucp_envelope(), **public}


@mcp.tool(
    meta=widgets.widget_meta("checkout"),
    annotations={"readOnlyHint": True, "openWorldHint": False, "destructiveHint": False},
)
def get_checkout(id: str) -> dict:
    """
    Retrieve an existing checkout session by ID.

    Args:
        id: The checkout session ID returned by create_checkout.
    """
    if err := _require_scope(_CHECKOUT_SCOPE):
        return err
    return _get_checkout_response(id)


@mcp.custom_route("/checkout-sessions/{id}", methods=["GET"])
async def get_checkout_session(request: Request) -> JSONResponse:
    """Public REST endpoint for the Next.js cart to hydrate agent checkout links."""
    checkout_id = request.path_params["id"]
    checkout = await run_in_threadpool(_load_checkout, checkout_id)
    if not checkout:
        return JSONResponse(
            {"messages": [{"type": "error", "code": "not_found",
                           "content": f"Checkout '{checkout_id}' not found",
                           "severity": "unrecoverable"}]},
            status_code=404,
        )
    return JSONResponse({"ucp": _ucp_envelope(), **checkout})


@mcp.tool(
    meta=widgets.widget_meta("checkout"),
    annotations={"readOnlyHint": False, "openWorldHint": False, "destructiveHint": False},
)
def update_checkout(
    id: str,
    line_items: Optional[list[dict]] = None,
    buyer: Optional[dict] = None,
    fulfillment: Optional[dict] = None,
    currency: Optional[str] = None,
) -> dict:
    """
    Update an existing checkout session.

    Args:
        id: The checkout session ID to update.
        line_items: Replacement line items (optional).
        buyer: Updated buyer info (optional).
        fulfillment: Updated fulfillment / shipping details (optional).
        currency: Updated currency code (optional).
    """
    if err := _require_scope(_CHECKOUT_SCOPE):
        return err
    checkout = _load_checkout(id)
    if not checkout:
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "not_found",
                          "content": f"Checkout '{id}' not found", "severity": "unrecoverable"}],
        }

    items = line_items or checkout["line_items"]
    enriched, _ = _enrich_line_items(items)
    merged_fulfillment = fulfillment if fulfillment is not None else checkout.get("fulfillment")
    has_shipping = bool(
        merged_fulfillment and any(
            m.get("type") == "shipping" and m.get("destinations")
            for m in merged_fulfillment.get("methods", [])
        )
    )
    totals = _compute_totals(enriched, has_shipping)

    checkout.update({
        "line_items": enriched,
        "totals": totals,
        "buyer": buyer if buyer is not None else checkout.get("buyer"),
        "fulfillment": merged_fulfillment,
        "currency": currency or checkout["currency"],
    })
    _save_checkout(checkout)
    return {"ucp": _ucp_envelope(), **checkout}


@mcp.tool(
    meta=widgets.widget_meta("confirmation"),
    annotations={"readOnlyHint": False, "openWorldHint": False, "destructiveHint": False},
)
def complete_checkout(
    id: str,
    idempotency_key: str,
    payment: Optional[dict] = None,
) -> dict:
    """
    Finalize a checkout session and place the order.

    Charges the cart total via Stripe (the UCP payment handler). Peek-A-Box is
    the merchant of record, so the agent submits a tokenized card — never raw
    card data. When no Stripe key is configured (or no instrument is supplied)
    the charge is simulated so the demo still completes.

    Args:
        id: The checkout session ID to complete.
        idempotency_key: A UUID for retry safety (also used as the Stripe
            idempotency key).
        payment: UCP payment object with one tokenized-card instrument, e.g.
            {"instruments": [{"handler_id": "com.stripe.payment",
                              "type": "tokenized_card", "selected": true,
                              "credential": {"payment_method": "pm_card_visa"}}]}
    """
    if err := _require_scope(_CHECKOUT_SCOPE):
        return err
    checkout = _load_checkout(id)
    if not checkout:
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "not_found",
                          "content": f"Checkout '{id}' not found", "severity": "unrecoverable"}],
        }
    if checkout["status"] == "canceled":
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "checkout_canceled",
                          "content": "Checkout has been canceled", "severity": "unrecoverable"}],
        }
    if checkout["status"] == "completed":
        return {"ucp": _ucp_envelope(), **checkout}

    # Carts with more than one item require the user to review and confirm
    # in the storefront before completing. Return the cart link instead.
    total_quantity = sum(li.get("quantity", 1) for li in checkout.get("line_items", []))
    if total_quantity > 1:
        return {
            "ucp": _ucp_envelope(),
            "status": "requires_action",
            "messages": [{
                "type": "info",
                "code": "review_required",
                "content": (
                    "This cart has more than one item and must be reviewed by the user "
                    "before it can be completed. Share the cart link with the user."
                ),
            }],
            "continue_url": checkout["continue_url"],
        }

    # Extract user identity from the token (if Identity Linking was done) and
    # use it to fill any missing buyer fields.
    user_claims: dict = {}
    try:
        access_token = get_access_token()
        if access_token and access_token.token:
            user_claims = _decode_jwt_claims(access_token.token)
    except Exception:
        pass

    user_email: Optional[str] = user_claims.get("email") or None
    user_name: Optional[str] = (
        user_claims.get("name") or user_claims.get("given_name") or None
    )

    # Back-fill buyer if not already set on the checkout
    existing_buyer = checkout.get("buyer") or {}
    if user_email and not existing_buyer.get("email"):
        existing_buyer["email"] = user_email
    if user_name and not existing_buyer.get("name"):
        existing_buyer["name"] = user_name
    if existing_buyer:
        checkout["buyer"] = existing_buyer

    # Charge the cart via Stripe (the UCP payment handler).
    charge = _charge_via_stripe(checkout, payment, idempotency_key)

    if charge["result"] == "failed":
        # Recoverable: the agent may retry complete_checkout with another instrument.
        return {
            "ucp": _ucp_envelope(),
            "status": "incomplete",
            "messages": [{
                "type": "error",
                "code": "payment_declined",
                "content": charge.get("message", "The payment was declined."),
                "severity": "recoverable",
            }],
        }

    if charge["result"] == "requires_action":
        return {
            "ucp": _ucp_envelope(),
            "status": "requires_action",
            "messages": [{
                "type": "info",
                "code": "payment_authentication_required",
                "content": charge.get("message", "Payment requires additional authentication."),
            }],
            "continue_url": checkout["continue_url"],
        }

    # Order confirmation link on the storefront (user signs in normally to view).
    confirm_url = f"{BASE_URL}/cart/confirm?session={checkout['id']}"

    order_id = checkout["id"].replace("checkout_", "order_", 1)
    # Store a sanitized payment summary
    payment_summary = {
        "status": "captured",
        "handler_id": STRIPE_PAYMENT_HANDLER_ID,
        "simulated": charge["result"] == "simulated",
    }
    if charge.get("payment_intent"):
        payment_summary["payment_intent"] = charge["payment_intent"]
    user_sub = user_claims.get("sub")
    if user_sub:
        _add_order(user_sub, {
            "id": order_id,
            "status": "completed",
            "currency": checkout.get("currency"),
            "totals": checkout.get("totals"),
            "line_items": checkout.get("line_items"),
            "permalink_url": confirm_url,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })

    checkout.update({
        "status": "completed",
        "payment": payment_summary,
        "order": {"id": order_id, "permalink_url": confirm_url},
    })
    _save_checkout(checkout)

    response = {"ucp": _ucp_envelope(), **checkout}
    if charge["result"] == "simulated":
        response["messages"] = [*checkout.get("messages", []), {
            "type": "info",
            "code": "payment_simulated",
            "content": (
                "No Stripe key configured or no payment instrument supplied — "
                "payment was simulated."
            ),
        }]
    return response


@mcp.tool()
def cancel_checkout(id: str, idempotency_key: str) -> dict:
    """
    Cancel an existing checkout session.

    Args:
        id: The checkout session ID to cancel.
        idempotency_key: A UUID for retry safety (required by UCP spec).
    """
    if err := _require_scope(_CHECKOUT_SCOPE):
        return err
    checkout = _load_checkout(id)
    if not checkout:
        return {
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{"type": "error", "code": "not_found",
                          "content": f"Checkout '{id}' not found", "severity": "unrecoverable"}],
        }
    checkout["status"] = "canceled"
    _save_checkout(checkout)
    return {"ucp": _ucp_envelope(), **checkout}


# ── Order tools ───────────────────────────────────────────────────────────────

@mcp.tool()
def get_orders() -> dict:
    """
    List the authenticated user's past orders (most recent first).
    """
    if err := _require_scope(_ORDER_READ_SCOPE):
        return err
    sub = _current_user_sub()
    orders = _load_orders(sub) if sub else []
    return {"ucp": _ucp_envelope(), "orders": orders, "total": len(orders)}


# ── MCP UI components ─────────────────────────────────────────────────────────
# Register the catalog / checkout / confirmation widgets as ui:// resources so
# hosts that support UI (ChatGPT, Claude / MCP Apps) render an interactive buying
# experience. See widgets.py for the dual-protocol details.
widgets.register_widgets(mcp)


# ── Entry point ───────────────────────────────────────────────────────────────
# Required scope per tool — checked at transport layer before FastMCP runs. Returns 403 for insufficient scope.

_TOOL_REQUIRED_SCOPES: dict[str, str] = {
    "create_checkout":   _CHECKOUT_SCOPE,
    "get_checkout":      _CHECKOUT_SCOPE,
    "update_checkout":   _CHECKOUT_SCOPE,
    "complete_checkout": _CHECKOUT_SCOPE,
    "cancel_checkout":   _CHECKOUT_SCOPE,
    "get_orders":        _ORDER_READ_SCOPE,
}


def _scopes_from_bearer(authorization: str) -> set[str]:
    """Extract OAuth scopes from a raw Authorization header value.

    Called after RequireAuthMiddleware has verified the JWT; we only read
    payload claims here to check the scope set.
    """
    if not authorization.lower().startswith("bearer "):
        return set()
    token = authorization[7:].strip()
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        claims = _json.loads(base64.urlsafe_b64decode(payload_b64))
        return set((claims.get("scope") or "").split())
    except Exception:
        return set()


class _OAuthScopeMiddleware:
    """Transport-layer OAuth scope enforcement per MCP authorization spec.

    Intercepts ``tools/call`` requests before FastMCP processes them.

    * No token present  → HTTP 401, ``invalid_token``
    * Token lacks scope → HTTP 403, ``insufficient_scope``
    * Token OK / tool has no scope requirement → pass through
    """

    def __init__(self, app: ASGIApp, resource_metadata_url: str | None = None) -> None:
        self.app = app
        self.resource_metadata_url = resource_metadata_url

    async def __call__(self, scope: ASGIScope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") != "POST":
            await self.app(scope, receive, send)
            return

        # Buffer body so we can peek at the tool name and replay it.
        chunks: list[bytes] = []
        more = True
        while more:
            msg = await receive()
            chunks.append(msg.get("body", b""))
            more = msg.get("more_body", False)
        body = b"".join(chunks)

        tool_name: str | None = None
        try:
            rpc = _json.loads(body)
            if rpc.get("method") == "tools/call":
                tool_name = rpc.get("params", {}).get("name")
        except Exception:
            pass

        required = _TOOL_REQUIRED_SCOPES.get(tool_name or "")
        if required:
            headers_raw: dict[bytes, bytes] = dict(scope.get("headers", []))
            authorization = headers_raw.get(b"authorization", b"").decode()
            has_token = authorization.lower().startswith("bearer ")

            if not has_token:
                # No token at all → identity linking required.
                await self._send_error(send, 401, "identity_required", required,
                                       "User identity is required; link an account to continue.")
                return

            if required not in _scopes_from_bearer(authorization):
                await self._send_error(send, 403, "insufficient_scope", required,
                                       f"The '{required}' scope is required for this action.",
                                       www_error="insufficient_scope")
                return

        replayed = False

        async def replay_receive() -> dict:
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay_receive, send)

    async def _send_error(
        self,
        send: Send,
        status: int,
        ucp_code: str,
        required_scope: str,
        description: str,
        www_error: str | None = None,
    ) -> None:

        params: list[str] = []
        if www_error:
            params.append(f'error="{www_error}"')
            params.append(f'error_description="{description}"')
        params.append(f'scope="{required_scope}"')
        if self.resource_metadata_url:
            params.append(f'resource_metadata="{self.resource_metadata_url}"')
        www_auth = "Bearer " + ", ".join(params)

        # UCP error envelope; the message carries the spec code
        # (identity_required / insufficient_scope).
        body = _json.dumps({
            "ucp": {"version": UCP_VERSION, "status": "error"},
            "messages": [{
                "type": "error",
                "code": ucp_code,
                "content": description,
                "severity": "unrecoverable",
            }],
            **({"required_scopes": [required_scope]} if ucp_code == "insufficient_scope" else {}),
        }).encode()

        await send({
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                (b"www-authenticate", www_auth.encode()),
            ],
        })
        await send({"type": "http.response.body", "body": body, "more_body": False})

import fastmcp.server.http as _fmcp_http
from fastmcp.server.auth.middleware import RequireAuthMiddleware as _BaseRequireAuthMiddleware


class _ScopedRequireAuthMiddleware:
    """Require valid Descope auth for every MCP request, with per-tool scope checks.

    Wraps FastMCP's RequireAuthMiddleware (JWT verification) around
    _OAuthScopeMiddleware (checkout/cart scope enforcement).
    """

    def __init__(self, app, required_scopes=None, resource_metadata_url=None):
        self.app = _BaseRequireAuthMiddleware(
            _OAuthScopeMiddleware(app, resource_metadata_url=resource_metadata_url),
            required_scopes,
            resource_metadata_url,
        )

    async def __call__(self, scope, receive, send):
        await self.app(scope, receive, send)


_fmcp_http.RequireAuthMiddleware = _ScopedRequireAuthMiddleware

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=MCP_PORT)
