# -*- coding: utf-8 -*-
"""
PROBE — read real geometry back out of a rendered page.

Every number the layout engine trusts comes from here, never from a model.
All four probes have the same shape: inject a script, dump the DOM in
headless Chrome, parse one JSON blob back out.

    block_heights   height of each block rendered at a given width
    settle_state    height of every item IN SITU + does any page overflow
    page_overflow   which finished pages are clipped by overflow:hidden
    column_heights  real rendered height of each .acol

Keeping all Chrome interaction in one file means `measure.py` and `pack.py`
are pure functions over numbers, and can be reasoned about (and tested)
without a browser.
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

from ..design import tokens as theme                            # noqa: E402

try:
    from chrome_util import resolve_chrome, get_scratch_dir
except Exception:                                                # pragma: no cover
    def resolve_chrome():
        for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                  "/Applications/Chromium.app/Contents/MacOS/Chromium"):
            if os.path.exists(p):
                return p
        raise SystemExit("no Chrome found; set PIPELINE_CHROME_BIN")

    def get_scratch_dir():
        p = os.path.join(tempfile.gettempdir(), "vidyut-scratch")
        os.makedirs(p, exist_ok=True)
        return p


def fonts_css():
    from ..design import fonts
    return fonts.css()


# --------------------------------------------------------------------------
# the one Chrome call everything else is built on
# --------------------------------------------------------------------------
def _dump(html, marker, window="1200,2000", budget=30000, timeout=300):
    """Render `html`, return the JSON left behind in <div id=marker>."""
    tmp = os.path.join(get_scratch_dir(), "probe_%s.html" % marker.lower())
    io.open(tmp, "w", encoding="utf-8").write(html)
    cmd = [resolve_chrome(), "--headless=new", "--disable-gpu", "--no-sandbox",
           "--hide-scrollbars", "--virtual-time-budget=%d" % budget,
           "--window-size=%s" % window, "--dump-dom", "file://" + tmp]
    dom = subprocess.run(cmd, capture_output=True, timeout=timeout).stdout.decode(
        "utf-8", "replace")
    m = re.search(r'<div id="%s">(.*?)</div>' % marker, dom, re.S)
    if not m:
        return None
    raw = m.group(1).replace("&quot;", '"').replace("&amp;", "&")
    return json.loads(raw or "null")


def _inject(html, js):
    return html.replace("</head>", "<script>%s</script></head>" % js, 1)


# --------------------------------------------------------------------------
JS_BLOCKS = """
window.addEventListener('load', function(){
  var out = {};
  document.querySelectorAll('[data-mid]').forEach(function(n){
    var r = n.getBoundingClientRect(), cs = getComputedStyle(n);
    out[n.getAttribute('data-mid')] =
       Math.ceil(r.height + parseFloat(cs.marginTop||0) + parseFloat(cs.marginBottom||0));
  });
  var d = document.createElement('div');
  d.id = 'BLOCKS'; d.textContent = JSON.stringify(out);
  document.body.appendChild(d);
});
"""


def block_heights(cells_html, width, mode="a4", extra_class="", timeout=300):
    """-> {mid: height} for a page of isolated blocks at `width` px."""
    html = ('<!DOCTYPE html><html lang="hi"><head><meta charset="utf-8">'
            '<style>%s</style><style>%s</style>'
            '<style>body{background:#fff;margin:0;padding:0;}[data-mid]{display:block;}</style>'
            '</head><body class="%s">%s</body></html>'
            % (fonts_css(), theme.stylesheet(mode), extra_class, cells_html))
    return _dump(_inject(html, JS_BLOCKS), "BLOCKS",
                 window="%d,2000" % (int(width) + 40), budget=20000, timeout=timeout)


# --------------------------------------------------------------------------
JS_SETTLE = """
window.addEventListener('load', function(){
  var items = {}, over = false;
  document.querySelectorAll('.page').forEach(function(p){
    var cs = getComputedStyle(p), pr = p.getBoundingClientRect();
    var pad = parseFloat(cs.paddingTop);
    var limit = parseFloat(cs.height) - pad - parseFloat(cs.paddingBottom);
    p.querySelectorAll('[data-it]').forEach(function(n){
      var r = n.getBoundingClientRect();
      items[n.getAttribute('data-it')] = [Math.ceil(r.height), Math.round(r.width)];
      if (r.bottom - pr.top - pad > limit + 1) over = true;
    });
    var fl = p.querySelector('[data-aside]');
    if (fl && fl.getBoundingClientRect().bottom - pr.top - pad > limit + 1) over = true;
  });
  var d = document.createElement('div');
  d.id = 'SETTLE'; d.textContent = JSON.stringify({over: over, items: items});
  document.documentElement.appendChild(d);
});
"""


def settle_state(html, timeout=300):
    """-> {"over": bool, "items": {item_id: [real height, real width]}}

    The WIDTH matters as much as the height. A block rendered beside the
    note column is ~594px wide and correspondingly tall; the same block
    below the note is 944px wide and much shorter. Reporting only the height
    let `settle` write a narrow measurement into the wide height, which then
    ratcheted and never came back down.
    """
    return _dump(_inject(html, JS_SETTLE), "SETTLE", timeout=timeout)


# --------------------------------------------------------------------------
JS_OVERFLOW = """
window.addEventListener('load', function(){
  var bad = [];
  document.querySelectorAll('.page').forEach(function(p, i){
    var cs = getComputedStyle(p), pr = p.getBoundingClientRect();
    var pad = parseFloat(cs.paddingTop);
    var limit = parseFloat(cs.height) - pad - parseFloat(cs.paddingBottom);
    var h = 0;
    Array.prototype.forEach.call(p.children, function(c){
      var b = c.getBoundingClientRect().bottom - pr.top - pad;
      if (b > h) h = b;
    });
    if (h > limit + 1) bad.push({page: i+1, used: Math.round(h), limit: Math.round(limit)});
  });
  var d = document.createElement('div');
  d.id = 'OVERFLOW'; d.textContent = JSON.stringify(bad);
  document.documentElement.appendChild(d);
});
"""


def page_overflow(html_path, timeout=300):
    """-> [{page, used, limit}] for every page clipped by overflow:hidden."""
    src = io.open(html_path, encoding="utf-8").read()
    return _dump(_inject(src, JS_OVERFLOW), "OVERFLOW", timeout=timeout)


# --------------------------------------------------------------------------
JS_COLS = """
window.addEventListener('load', function(){
  var out = [];
  document.querySelectorAll('.acols').forEach(function(a){
    var cs = [];
    a.querySelectorAll('.acol').forEach(function(c){
      var last = c.lastElementChild;
      cs.push(last ? Math.round(last.getBoundingClientRect().bottom
                                - c.getBoundingClientRect().top) : 0);
    });
    out.push(cs);
  });
  var d = document.createElement('div');
  d.id = 'COLS'; d.textContent = JSON.stringify(out);
  document.documentElement.appendChild(d);
});
"""


def column_heights(html_path, timeout=300):
    """Real rendered height of each `.acol`.

    Byte-length is a useless proxy: a figure slot is 200 bytes and 158px
    tall, a paragraph is 400 bytes and 60px tall. Measuring the markup once
    made 28 of 29 pages look lopsided when they were not."""
    src = io.open(html_path, encoding="utf-8").read()
    return _dump(_inject(src, JS_COLS), "COLS", timeout=timeout)


# --------------------------------------------------------------------------
JS_EMPTY = """
window.addEventListener('load', function(){
  var out = [];
  document.querySelectorAll('.page').forEach(function(p, i){
    var cs = getComputedStyle(p), pr = p.getBoundingClientRect();
    var pad = parseFloat(cs.paddingTop);
    var limit = parseFloat(cs.height) - pad - parseFloat(cs.paddingBottom);
    var boxes = [];
    var cols = p.querySelectorAll('.acol');
    var scopes = cols.length ? cols : [p];
    Array.prototype.forEach.call(scopes, function(sc, ci){
      var last = sc.lastElementChild;
      var used = last ? last.getBoundingClientRect().bottom - pr.top - pad : 0;
      boxes.push({col: ci, used: Math.round(used), free: Math.round(limit - used)});
    });
    out.push({page: i+1, limit: Math.round(limit), cols: boxes});
  });
  var d = document.createElement('div');
  d.id = 'EMPTY'; d.textContent = JSON.stringify(out);
  document.documentElement.appendChild(d);
});
"""


def empty_space_html(html, timeout=300):
    """Same as `empty_space` but for an in-memory document."""
    return _dump(_inject(html, JS_EMPTY), "EMPTY", timeout=timeout)


def empty_space(html_path, timeout=300):
    """-> per page, per column: how much vertical space is left unused."""
    src = io.open(html_path, encoding="utf-8").read()
    return _dump(_inject(src, JS_EMPTY), "EMPTY", timeout=timeout)
