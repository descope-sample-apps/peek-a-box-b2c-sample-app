"""
MCP UI components (widgets) for the Peek-A-Box UCP server.

These render an interactive buying experience inside MCP hosts that support UI
resources — both ChatGPT (OpenAI Apps SDK) and Claude / other MCP Apps hosts
(SEP-1865) — from a single implementation:

  * Each widget is a self-contained inline HTML document (no build step, no CDN).
  * A tiny bridge (`window.PAB`) normalizes the two host APIs:
      - ChatGPT: `window.openai.toolOutput` / `.callTool` / `.sendFollowUpMessage`
        / `.openExternal`, and the `openai:set_globals` event.
      - MCP Apps (Claude): JSON-RPC over `postMessage` — `ui/initialize` handshake,
        `ui/notifications/tool-result`, and the classic mcp-ui `{type,payload}`
        actions that `@mcp-ui/client` bridges (`tool`, `prompt`, `link`).
  * Widgets read their data from the tool result's `structuredContent`, so the
    HTML template is static and shared across calls.

The visual design mirrors the Peek-A-Box storefront (see components/product-card.tsx,
app/page.tsx, app/styles/globals.css): Geist type, the box-logo + "#number" tile
treatment, dark foreground-pill badges, italic descriptions, tabular-nums prices,
borderless muted tiles, and the cart's order-summary rows — so a widget reads as the
same product, in light or dark.

Each widget is registered twice — once as `text/html+skybridge` (what ChatGPT
consumes) and once as `text/html;profile=mcp-app` (what MCP Apps hosts negotiate)
— and the tool descriptor advertises both via `openai/outputTemplate` and
`ui.resourceUri`.

Spec references:
  * OpenAI Apps SDK: https://developers.openai.com/apps-sdk/reference
  * MCP Apps (SEP-1865): https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
"""

from _fonts import FONT_FACE_CSS  # embedded, subsetted Geist (see scripts/subset_fonts.py)

# The storefront box mark (public/Peek-A-Box_icon-light.svg), recolored via
# currentColor so it themes with light/dark like the app's logo-light/logo-dark swap.
_LOGO_PATH = (
    "M137.27,40.26s-9.03-12.05-26.71-10.08c6.99-2.1,12.93-1.72,17.64-.45v-7.4s-.02-.03-.02-.05v-3.34"
    "c0-4.23-3.43-7.66-7.66-7.66H18.39c-4.23,0-7.66,3.43-7.66,7.66v102.12c0,4.23,3.43,7.66,7.66,7.66"
    "h102.12c4.23,0,7.66-3.43,7.66-7.66v-58.25h-.03c.01-.05.05-.1.05-.15v-6.74c-1.64,1.18-3.55,2.06-5.68,2.4"
    "-7.34,1.18-14.24-3.81-15.42-11.15-.54-3.36.27-6.6,1.95-9.27,1.19-.12,2.53-.21,3.96-.26.69,0,1.43-.05,2.1-.05"
    ".11,0,.22,0,.33,0,1.76.02,3.43.1,5.02.2-1.48,1.13-2.45,2.89-2.45,4.9,0,3.41,2.77,6.18,6.18,6.18s6.18-2.77,6.18-6.18"
    "c0-1.55-.59-2.95-1.54-4.04,2.63.4,5.43.92,8.44,1.61ZM88.85,52.1c3.41,0,6.18-2.77,6.18-6.18,0-1.55-.59-2.95-1.53-4.03"
    ".99.07,2,.14,2.96.24,1.73,2.79,2.48,6.2,1.8,9.67-1.44,7.29-8.51,12.04-15.8,10.6-7.29-1.44-12.04-8.51-10.6-15.8"
    ".32-1.63.96-3.1,1.78-4.43,3.75-.39,7.35-.56,10.83-.59-1.11,1.12-1.79,2.65-1.79,4.35,0,3.41,2.77,6.18,6.18,6.18Z"
)
_LOGO_SVG = (
    '<svg class="mark" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    '<path fill="currentColor" d="' + _LOGO_PATH + '"/></svg>'
)

# ── Shared styles — mirrors app/styles/globals.css tokens + storefront components ─
_CSS = r"""
:root{
  --bg: oklch(0.98 0.01 70);
  --fg: oklch(0.25 0.03 55);
  --card: oklch(1 0 0);
  --muted: oklch(0.92 0.02 70);
  --muted-fg: oklch(0.5 0.03 55);
  --primary: oklch(0.65 0.08 55);
  --primary-fg: oklch(0.98 0.01 70);
  --border: oklch(0.85 0.04 60);
  --accent: oklch(0.5 0.12 175);
  --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
:root[data-theme="dark"]{
  --bg: oklch(0.18 0.02 55);
  --fg: oklch(0.92 0.02 70);
  --card: oklch(0.22 0.025 55);
  --muted: oklch(0.26 0.025 55);
  --muted-fg: oklch(0.82 0.02 70);
  --primary: oklch(0.72 0.08 55);
  --primary-fg: oklch(0.18 0.02 55);
  --border: oklch(0.35 0.03 55);
  --accent: oklch(0.6 0.1 175);
}
*{box-sizing:border-box}
html,body{margin:0}
body{
  font-family:var(--font-sans);
  color:var(--fg); background:transparent; padding:2px;
  line-height:1.45; -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
.head{display:flex;align-items:center;gap:8px;margin:2px 2px 16px}
.head .brand{display:flex;align-items:center;gap:7px;color:var(--fg)}
.head .brand .mark{width:18px;height:18px}
.head .brand .name{font-weight:600;letter-spacing:-.015em;font-size:14px}
.head .sub{margin-left:auto;color:var(--muted-fg);font-size:12.5px}

/* Product tile — mirrors components/product-card.tsx */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:22px}
.card{position:relative}
.tile{
  position:relative;aspect-ratio:1/1;border-radius:12px;background:var(--muted);
  overflow:hidden;display:flex;align-items:center;justify-content:center;
}
.markwrap{position:relative;width:52%;height:52%;max-width:112px;max-height:112px;
  display:flex;align-items:center;justify-content:center;color:var(--fg);
  transition:transform .5s ease}
.card:hover .markwrap{transform:scale(1.08) rotate(3deg)}
.markwrap .mark{width:100%;height:100%}
.markwrap .num{
  position:absolute;left:50%;bottom:12%;transform:translateX(-50%);
  font-weight:700;font-variant-numeric:tabular-nums;font-size:15px;letter-spacing:-.01em;
  color:var(--bg);text-shadow:0 1px 2px rgba(0,0,0,.18);
}
.badge{
  position:absolute;left:12px;top:12px;background:var(--fg);color:var(--bg);
  border-radius:999px;padding:4px 11px;font-size:11px;font-weight:500;
  text-transform:uppercase;letter-spacing:.06em;
}
.add{
  position:absolute;right:12px;bottom:12px;width:40px;height:40px;border-radius:999px;
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  background:var(--card);color:var(--fg);border:1px solid var(--border);
  box-shadow:0 4px 12px rgba(0,0,0,.14);transition:background .18s ease,color .18s ease,transform .06s ease;
}
.add:hover{background:var(--fg);color:var(--bg)}
.add:active{transform:scale(.94)}
.add[disabled]{opacity:.55;cursor:default}
.add svg{width:18px;height:18px}
.meta{margin-top:15px}
.meta .row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.meta .title{font-weight:500;font-size:16px;line-height:1.2}
.meta .price{font-weight:500;font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
.meta .desc{margin-top:6px;font-style:italic;color:var(--muted-fg);font-size:14.5px}

/* Panels — mirror cart / order-confirm */
.panel{border:1px solid color-mix(in oklch, var(--fg) 10%, transparent);
  background:var(--card);border-radius:16px;padding:20px;max-width:520px}
.phead{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.phead .tilesm{width:44px;height:44px;border-radius:12px;background:var(--muted);
  display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.phead .tilesm .mark{width:24px;height:24px;color:var(--fg)}
.phead h2{margin:0;font-size:18px;font-weight:600;letter-spacing:-.02em}
.phead p{margin:2px 0 0;color:var(--muted-fg);font-size:13px}
.banner{border-radius:16px;background:color-mix(in oklch, var(--muted) 60%, transparent);
  padding:18px;text-align:center}
.banner h2{margin:0;font-size:19px;font-weight:600;letter-spacing:-.02em}
.banner p{margin:6px 0 0;color:var(--muted-fg);font-size:14px}
.banner p .who{color:var(--fg);font-weight:600}

.lines{margin:14px 0 2px;display:flex;flex-direction:column;gap:10px}
.li{display:flex;align-items:center;gap:12px}
.li .tilesm{width:40px;height:40px;border-radius:11px;background:var(--muted);
  display:flex;align-items:center;justify-content:center;flex:0 0 auto;position:relative}
.li .tilesm .mark{width:20px;height:20px;color:var(--fg)}
.li .info{flex:1;min-width:0}
.li .nm{font-weight:500;font-size:14.5px}
.li .qty{color:var(--muted-fg);font-size:12.5px;margin-top:1px}
.li .amt{font-weight:500;font-variant-numeric:tabular-nums;font-size:14.5px}
.summary{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.summary .sr{display:flex;justify-content:space-between;color:var(--muted-fg);font-size:14px}
.summary .tot{display:flex;justify-content:space-between;border-top:1px solid var(--border);
  padding-top:12px;font-weight:600;font-size:16px;color:var(--fg)}
.summary .tot .amt{font-variant-numeric:tabular-nums}
.buyer{margin-top:14px;color:var(--muted-fg);font-size:13px}
.note{margin-top:14px;font-size:13px;color:var(--muted-fg);
  background:color-mix(in oklch, var(--muted) 55%, transparent);border-radius:12px;padding:11px 13px}
.detail{margin-top:16px;border:1px solid color-mix(in oklch, var(--fg) 10%, transparent);
  border-radius:14px;overflow:hidden}
.detail .dr{display:flex;justify-content:space-between;align-items:center;
  padding:12px 15px;font-size:14.5px;border-bottom:1px solid color-mix(in oklch, var(--fg) 8%, transparent)}
.detail .dr:last-child{border-bottom:0}
.detail .dr .k{color:var(--muted-fg)}
.detail .dr .v{font-weight:500;font-variant-numeric:tabular-nums}
.chip{display:inline-block;background:var(--fg);color:var(--bg);border-radius:999px;
  padding:3px 11px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}

.actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
.btn{appearance:none;cursor:pointer;border-radius:999px;font-weight:500;font-size:14px;
  padding:11px 18px;border:0;flex:1;min-width:150px;text-align:center;
  transition:filter .15s ease,background .15s ease,transform .05s ease;font-family:inherit}
.btn:active{transform:translateY(1px)}
.btn.primary{background:var(--primary);color:var(--primary-fg)}
.btn.primary:hover{filter:brightness(.94)}
.btn.outline{background:transparent;color:var(--fg);
  border:1.5px solid color-mix(in oklch, var(--fg) 22%, transparent)}
.btn.outline:hover{background:color-mix(in oklch, var(--muted) 70%, transparent)}
.btn[disabled]{opacity:.6;cursor:default}
.empty{color:var(--muted-fg);text-align:center;padding:30px 18px;font-size:14.5px;font-style:italic}
"""

# ── Host bridge: normalizes ChatGPT (window.openai) and MCP Apps (postMessage) ─
_BRIDGE = r"""
(function () {
  var seq = 0;
  function nid(p){ return p + '-' + Date.now() + '-' + (++seq); }
  var PAB = window.PAB = {};
  var latest = null;

  function oai(){ return window.openai; }

  PAB.getData = function () {
    if (oai() && oai().toolOutput) return oai().toolOutput;
    return latest;
  };
  PAB.theme = function () {
    if (oai() && oai().theme) return oai().theme;
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  };
  PAB.callTool = function (name, args) {
    if (oai() && typeof oai().callTool === 'function') return oai().callTool(name, args || {});
    window.parent.postMessage({ type:'tool', messageId:nid(name), payload:{ toolName:name, params:args || {} } }, '*');
    return Promise.resolve();
  };
  PAB.sendPrompt = function (prompt) {
    if (oai() && typeof oai().sendFollowUpMessage === 'function') return oai().sendFollowUpMessage({ prompt: prompt });
    window.parent.postMessage({ type:'prompt', messageId:nid('prompt'), payload:{ prompt: prompt } }, '*');
    return Promise.resolve();
  };
  PAB.openLink = function (url) {
    if (!url) return;
    if (oai() && typeof oai().openExternal === 'function') return oai().openExternal({ href: url });
    window.parent.postMessage({ type:'link', messageId:nid('link'), payload:{ url: url } }, '*');
  };

  function applyTheme(){ document.documentElement.setAttribute('data-theme', PAB.theme()); }
  PAB.emit = function () { applyTheme(); window.dispatchEvent(new CustomEvent('pab:data')); };

  var initId = null, initialized = false;
  function sendInitialized(){
    if (initialized) return;
    initialized = true;
    try { window.parent.postMessage({ jsonrpc:'2.0', method:'ui/notifications/initialized', params:{} }, '*'); } catch (e) {}
  }

  // ChatGPT — globals updates (theme, toolOutput, displayMode, ...)
  window.addEventListener('openai:set_globals', PAB.emit);

  // MCP Apps (Claude) — JSON-RPC over postMessage
  window.addEventListener('message', function (e) {
    var m = e && e.data;
    if (!m || typeof m !== 'object') return;
    var method = m.method || '';
    if (method.indexOf('tool-result') !== -1 || method.indexOf('tool-input') !== -1) {
      var p = m.params || {};
      var d = p.structuredContent || p.structured_content ||
              (p.result && (p.result.structuredContent || p.result.structured_content)) ||
              p.result || p.toolOutput || null;
      if (d) { latest = d; PAB.emit(); }
    }
    if (method.indexOf('host-context-changed') !== -1 && m.params && m.params.hostContext) {
      if (m.params.hostContext.theme) document.documentElement.setAttribute('data-theme', m.params.hostContext.theme);
      PAB.emit();
    }
    // Response to our ui/initialize: apply host context, THEN announce initialized
    // (MCP lifecycle order — send `initialized` only after the initialize result).
    if (initId && m.id === initId && m.result) {
      var hc = m.result.hostContext;
      if (hc && hc.theme) document.documentElement.setAttribute('data-theme', hc.theme);
      sendInitialized();
      PAB.emit();
    }
  });

  // MCP Apps handshake — send ui/initialize; `initialized` is sent only after its
  // response arrives (see the message listener above), never before.
  initId = nid('init');
  try {
    window.parent.postMessage({ jsonrpc:'2.0', id:initId, method:'ui/initialize',
      params:{ protocolVersion:'2026-01-26', capabilities:{}, clientInfo:{ name:'peek-a-box-widget', version:'1.0.0' } } }, '*');
  } catch (e) {}

  // ── Shared helpers ──────────────────────────────────────────────────────
  PAB.LOGO = '__LOGO_SVG__';
  PAB.money = function (cents, cur) {
    cur = cur || 'USD';
    var v = (Number(cents) || 0) / 100;
    return cur === 'USD' ? '$' + v.toFixed(2) : v.toFixed(2) + ' ' + cur;
  };
  PAB.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  };
  PAB.boxNum = function (name, id) {
    var m = String(name || '').match(/#(\S+)/);
    if (m) return m[1];
    return String(id || '').replace(/^box-/, '');
  };
  PAB.errorsOf = function (d) {
    return ((d && d.messages) || []).filter(function (m) { return m && m.type === 'error'; });
  };

  applyTheme();
  // Defer the first paint so the render script (the next <script>) has registered its
  // pab:data listener first. On an already-parsed document (readyState !== 'loading')
  // a synchronous emit would fire before anyone is listening and stick on "Loading…".
  function firstPaint(){ PAB.emit(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', firstPaint);
  else setTimeout(firstPaint, 0);
})();
""".replace("__LOGO_SVG__", _LOGO_SVG.replace("'", "\\'"))

_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'

# ── Per-widget render scripts ─────────────────────────────────────────────────

_CATALOG_JS = (r"""
var PLUS = '__PLUS__';
function card(it){
  var num = PAB.boxNum(it.title, it.id);
  var badge = it.badge ? '<span class="badge">'+PAB.esc(it.badge)+'</span>' : '';
  return ''
    + '<div class="card">'
    +   '<div class="tile">'+badge
    +     '<div class="markwrap">'+PAB.LOGO+'<span class="num">#'+PAB.esc(num)+'</span></div>'
    +     '<button class="add" data-add="'+PAB.esc(it.id)+'" data-name="'+PAB.esc(it.title)+'" aria-label="Add '+PAB.esc(it.title)+'">'+PLUS+'</button>'
    +   '</div>'
    +   '<div class="meta"><div class="row"><span class="title">'+PAB.esc(it.title)+'</span>'
    +     '<span class="price">'+PAB.money(it.price, it.currency)+'</span></div>'
    +     '<div class="desc">'+PAB.esc(it.description||'')+'</div></div>'
    + '</div>';
}
function render(){
  var d = PAB.getData() || {};
  var root = document.getElementById('root');
  var errs = PAB.errorsOf(d);
  if (errs.length){ root.innerHTML = '<div class="empty">'+PAB.esc(errs[0].content||'Something went wrong.')+'</div>'; return; }
  var items = d.items || [];
  if (!items.length){ root.innerHTML = '<div class="empty">No boxes match that search. Try &ldquo;haunted&rdquo;, &ldquo;premium&rdquo;, or browse the whole shelf.</div>'; return; }
  root.innerHTML = '<div class="grid">'+items.map(card).join('')+'</div>';
  root.querySelectorAll('[data-add]').forEach(function(b){
    b.addEventListener('click', function(){
      var name = b.getAttribute('data-name'), id = b.getAttribute('data-add');
      b.disabled = true;
      PAB.sendPrompt('Create a checkout for ' + name + ' (' + id + '), quantity 1, and show me the cart.');
    });
  });
}
window.addEventListener('pab:data', render);
""").replace("__PLUS__", _PLUS.replace("'", "\\'"))

_CHECKOUT_JS = r"""
function lineRow(li, cur){
  var it = li.item || {};
  var num = PAB.boxNum(it.title, it.id);
  var q = (li.quantity == null ? 1 : li.quantity);
  return '<div class="li"><div class="tilesm">'+PAB.LOGO+'</div>'
    + '<div class="info"><div class="nm">'+PAB.esc(it.title||('Box #'+num))+'</div>'
    + '<div class="qty">Qty '+q+'</div></div>'
    + '<div class="amt">'+PAB.money((it.price||0)*q, cur)+'</div></div>';
}
function summaryRow(t, cur){
  var label = t.display_text || ({subtotal:'Subtotal', fulfillment:'Shipping', total:'Total', tax:'Tax'}[t.type] || t.type);
  if (t.type === 'total') return '<div class="tot"><span>'+PAB.esc(label)+'</span><span class="amt">'+PAB.money(t.amount, cur)+'</span></div>';
  return '<div class="sr"><span>'+PAB.esc(label)+'</span><span>'+PAB.money(t.amount, cur)+'</span></div>';
}
function render(){
  var c = PAB.getData() || {};
  var root = document.getElementById('root');
  var errs = PAB.errorsOf(c);
  if (errs.length){
    var e = errs[0];
    var needLogin = (e.code||'').match(/identity|insufficient_scope|unauthor/i);
    root.innerHTML = '<div class="panel"><div class="phead"><div class="tilesm">'+PAB.LOGO+'</div>'
      + '<div><h2>'+(needLogin?'Sign-in needed':'Checkout error')+'</h2>'
      + '<p>'+PAB.esc(e.content||'This checkout could not be prepared.')+'</p></div></div></div>';
    return;
  }
  var items = c.line_items || [];
  var totals = c.totals || [];
  var buyer = c.buyer || null;
  var qty = items.reduce(function(a,li){return a+(li.quantity == null ? 1 : li.quantity);},0);
  var multi = qty > 1;
  var buyerHtml = buyer && (buyer.name || buyer.email)
    ? '<div class="buyer">For '+PAB.esc(buyer.name||'')+(buyer.email?(' &middot; '+PAB.esc(buyer.email)):'')+'</div>' : '';

  root.innerHTML = ''
    + '<div class="panel">'
    +   '<div class="phead"><div class="tilesm">'+PAB.LOGO+'</div><div>'
    +     '<h2>Review your order</h2><p>'+items.length+' item'+(items.length===1?'':'s')+'</p></div></div>'
    +   '<div class="lines">'+items.map(function(li){return lineRow(li, c.currency);}).join('')+'</div>'
    +   '<div class="summary">'+totals.map(function(t){return summaryRow(t, c.currency);}).join('')+'</div>'
    +   buyerHtml
    +   (multi ? '<div class="note">Carts with more than one item are confirmed in the browser for your security.</div>' : '')
    +   '<div class="actions">'
    +     (multi
        ? '<button class="btn primary" data-open>Review &amp; pay in browser</button>'
        : '<button class="btn primary" data-complete>Complete purchase</button>'
          + '<button class="btn outline" data-open>Open in browser</button>')
    +   '</div>'
    + '</div>';

  var openBtn = root.querySelector('[data-open]');
  if (openBtn) openBtn.addEventListener('click', function(){ PAB.openLink(c.continue_url); });
  var payBtn = root.querySelector('[data-complete]');
  if (payBtn) payBtn.addEventListener('click', function(){
    payBtn.disabled = true; payBtn.textContent = 'Placing order…';
    PAB.sendPrompt('Complete checkout ' + c.id + ' and place the order.');
  });
}
window.addEventListener('pab:data', render);
"""

_CONFIRM_JS = r"""
function totalOf(c){
  var t = (c.totals||[]).filter(function(x){return x.type==='total';})[0];
  return t ? PAB.money(t.amount, c.currency) : '';
}
function render(){
  var c = PAB.getData() || {};
  var root = document.getElementById('root');

  var errs = PAB.errorsOf(c);
  if (errs.length){
    var e = errs[0];
    root.innerHTML = '<div class="panel"><div class="phead"><div class="tilesm">'+PAB.LOGO+'</div>'
      + '<div><h2>Payment didn’t go through</h2><p>'+PAB.esc(e.content||'')+'</p></div></div>'
      + (c.continue_url?'<div class="actions"><button class="btn primary" data-open>Try in browser</button></div>':'')
      + '</div>';
    var ob = root.querySelector('[data-open]'); if (ob) ob.addEventListener('click', function(){PAB.openLink(c.continue_url);});
    return;
  }

  if (c.status && c.status !== 'completed'){
    root.innerHTML = '<div class="panel"><div class="phead"><div class="tilesm">'+PAB.LOGO+'</div>'
      + '<div><h2>One more step</h2><p>'+PAB.esc((c.messages&&c.messages[0]&&c.messages[0].content)||'Finish this order in your browser.')+'</p></div></div>'
      + '<div class="actions"><button class="btn primary" data-open>Continue in browser</button></div></div>';
    root.querySelector('[data-open]').addEventListener('click', function(){PAB.openLink(c.continue_url);});
    return;
  }

  var order = c.order || {};
  var link = order.permalink_url || c.permalink_url;
  var buyer = c.buyer || {};
  var who = buyer.name || (buyer.email ? buyer.email.split('@')[0] : '');
  var simulated = c.payment && c.payment.simulated;
  root.innerHTML = ''
    + '<div class="banner"><h2>Order confirmed</h2>'
    +   '<p>'+(who?('Thank you, <span class="who">'+PAB.esc(who)+'</span>! '):'')+'Your order has been placed.</p></div>'
    + '<div class="detail">'
    +   '<div class="dr"><span class="k">Order</span><span class="v">'+PAB.esc(order.id||c.id||'')+'</span></div>'
    +   '<div class="dr"><span class="k">Total charged</span><span class="v">'+totalOf(c)+'</span></div>'
    +   '<div class="dr"><span class="k">Status</span><span class="chip">Completed</span></div>'
    + '</div>'
    + (simulated ? '<div class="note">Demo mode: no Stripe key configured, so the charge was simulated.</div>' : '')
    + (link ? '<div class="actions"><button class="btn primary" data-view>View your order</button></div>' : '');
  var vb = root.querySelector('[data-view]');
  if (vb) vb.addEventListener('click', function(){ PAB.openLink(link); });
}
window.addEventListener('pab:data', render);
"""


def _doc(title: str, render_js: str) -> str:
    """Assemble a full, self-contained widget HTML document."""
    return (
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<title>" + title + "</title><style>" + FONT_FACE_CSS + _CSS + "</style></head><body>"
        "<div class=\"head\"><span class=\"brand\">" + _LOGO_SVG +
        "<span class=\"name\">Peek-A-Box</span></span>"
        "<span class=\"sub\">mystery box store</span></div>"
        "<div id=\"root\"><div class=\"empty\">Loading…</div></div>"
        "<script>" + _BRIDGE + "</script>"
        "<script>" + render_js + "</script>"
        "</body></html>"
    )


# ── Widget registry ───────────────────────────────────────────────────────────

WIDGETS = {
    "catalog": {
        "title": "Peek-A-Box catalog",
        "description": "A grid of Peek-A-Box mystery boxes with prices and an add-to-checkout button.",
        "invoking": "Opening the Peek-A-Box shelf",
        "invoked": "Here are the boxes",
        "html": _doc("Peek-A-Box catalog", _CATALOG_JS),
    },
    "checkout": {
        "title": "Peek-A-Box checkout",
        "description": "A checkout review card showing line items, totals, and buttons to complete the purchase or continue in the browser.",
        "invoking": "Preparing your checkout",
        "invoked": "Your checkout is ready",
        "html": _doc("Peek-A-Box checkout", _CHECKOUT_JS),
    },
    "confirmation": {
        "title": "Peek-A-Box order",
        "description": "An order confirmation receipt with the order id, total charged, and a link to view the order.",
        "invoking": "Placing your order",
        "invoked": "Order confirmed",
        "html": _doc("Peek-A-Box order", _CONFIRM_JS),
    },
}


def _skybridge_uri(key: str) -> str:
    return f"ui://widget/{key}.html"


def _mcp_app_uri(key: str) -> str:
    return f"ui://widget/{key}.mcp-app.html"


def widget_meta(key: str) -> dict:
    """Build the tool-descriptor `_meta` that advertises this widget to both
    ChatGPT (openai/*) and MCP Apps hosts (ui.*)."""
    w = WIDGETS[key]
    return {
        "openai/outputTemplate": _skybridge_uri(key),
        "openai/toolInvocation/invoking": w["invoking"],
        "openai/toolInvocation/invoked": w["invoked"],
        "openai/widgetAccessible": True,
        "openai/widgetDescription": w["description"],
        "ui": {
            "resourceUri": _mcp_app_uri(key),
            "prefersBorder": True,
        },
    }


def register_widgets(mcp) -> None:
    """Register every widget as two resources: `text/html+skybridge` (ChatGPT)
    and `text/html;profile=mcp-app` (MCP Apps / Claude), serving identical HTML."""
    def _make(html):
        def _res():
            return html
        return _res

    for key, w in WIDGETS.items():
        html = w["html"]
        meta = widget_meta(key)
        mcp.resource(
            _skybridge_uri(key),
            name=w["title"],
            description=w["description"],
            mime_type="text/html+skybridge",
            meta=meta,
        )(_make(html))
        mcp.resource(
            _mcp_app_uri(key),
            name=w["title"] + " (MCP Apps)",
            description=w["description"],
            mime_type="text/html;profile=mcp-app",
            meta=meta,
        )(_make(html))
