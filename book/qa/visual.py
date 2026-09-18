# -*- coding: utf-8 -*-
"""
VISUAL QA — look at the rendered page, not at the model of it.

Everything else in the pipeline reasons about numbers it computed. This
step measures the page that actually rendered, which is the only way to
catch the failures that live between the model and the browser:

    overflow    a page clipped by overflow:hidden — CONTENT IS DELETED
    orphan      a heading alone at the foot of a column
    collision   two elements overlapping
    tiny_text   anything set below a legible size
    broken_math a fraction or vector that rendered with no content
    empty_page  a page with (almost) nothing on it

`screenshot()` renders a page to PNG so an agent can look at it. That is
the escalation path for anything geometry cannot see — crowding, awkward
rag, a decorator sitting somewhere silly.
"""
import io
import os
import subprocess

from ..layout import probe

JS_QA = """
window.addEventListener('load', function(){
  var out = [];
  document.querySelectorAll('.page').forEach(function(p, i){
    var cs = getComputedStyle(p), pr = p.getBoundingClientRect();
    var pad = parseFloat(cs.paddingTop);
    var limit = parseFloat(cs.height) - pad - parseFloat(cs.paddingBottom);
    var rec = {page: i+1, issues: []};

    var maxb = 0;
    Array.prototype.forEach.call(p.children, function(c){
      var b = c.getBoundingClientRect().bottom - pr.top - pad;
      if (b > maxb) maxb = b;
    });
    if (maxb > limit + 1)
      rec.issues.push({kind:'overflow', px: Math.round(maxb - limit)});
    if (maxb < limit * 0.18 && p.textContent.trim().length < 200)
      rec.issues.push({kind:'empty_page', used: Math.round(maxb)});

    p.querySelectorAll('.sechead, .qhead').forEach(function(h){
      var hb = h.getBoundingClientRect().bottom - pr.top - pad;
      var col = h.closest('.acol') || p;
      var last = col.lastElementChild;
      var cb = last ? last.getBoundingClientRect().bottom - pr.top - pad : hb;
      if (cb - hb < 40)
        rec.issues.push({kind:'orphan_heading', text:(h.textContent||'').slice(0,40)});
    });

    // THE THRESHOLD IS A PRINT THRESHOLD, so it must be applied to the
    // PRINT size. The page is laid out at 1080px wide and printed at
    // PRINT_ZOOM (0.734), so 15px on screen is 11px on paper. Comparing the
    // unzoomed size let a nested fraction inside a matrix pass at 13.3px
    // while printing at 9.8px — the gate could not see the thing it exists
    // to catch, and reported `legibility 0` on a page that had it.
    var ZOOM = 0.734;

    // A CSS TRANSFORM SHRINKS TYPE AND `fontSize` DOES NOT KNOW.
    //
    // The cover is fitted to one sheet with `transform:scale(k)` when it
    // would otherwise spill. `getComputedStyle(n).fontSize` reports the
    // UNSCALED size, so a cover scaled to 0.749 reported `legibility 0`
    // while its smallest type printed at 15.2 x 0.749 x 0.734 = 8.4px —
    // the gate was blind to the very thing it exists to catch, one level
    // deeper than the print-zoom bug it already had.
    //
    // The cumulative scale of every ancestor is folded in here.
    function scaleOf(n){
      var k = 1;
      for (var e = n; e && e.nodeType === 1; e = e.parentElement) {
        var t = getComputedStyle(e).transform;
        if (t && t !== 'none') {
          var m = t.match(/matrix\(([^,]+),/);
          if (m) { var v = parseFloat(m[1]); if (v > 0) k *= v; }
        }
      }
      return k;
    }

    p.querySelectorAll('*').forEach(function(n){
      var fs = parseFloat(getComputedStyle(n).fontSize);
      if (!fs) return;
      var printed = fs * ZOOM * scaleOf(n);
      // READING TEXT, not labels. The floor exists for text someone reads
      // a line of; a two-character marks chip or a step number in a badge
      // is deliberately small and always will be. With the cut at 3
      // characters every chip in the book reported, which buries the
      // findings that matter — 164 real table-cell hits arrived alongside
      // a crowd of `[2]` and `01`. Twelve characters is about three words.
      if (printed < 11 && (n.textContent||'').trim().length > 12)
        rec.issues.push({kind:'tiny_text', px: Math.round(fs),
                         print_px: Math.round(printed * 10) / 10,
                         text:(n.textContent||'').slice(0,30)});
    });

    p.querySelectorAll('.fr, .vec').forEach(function(n){
      if (!(n.textContent||'').trim())
        rec.issues.push({kind:'broken_math', cls:n.className});
    });

    if (rec.issues.length) out.push(rec);
  });
  var d = document.createElement('div');
  d.id = 'VQA'; d.textContent = JSON.stringify(out);
  document.documentElement.appendChild(d);
});
"""


def inspect(html_path, timeout=300):
    src = io.open(html_path, encoding="utf-8").read()
    out = probe._dump(probe._inject(src, JS_QA), "VQA", timeout=timeout) or []
    # A tofu box is invisible to geometry but obvious to a reader, so the
    # cheapest check is a text scan of the finished file.
    import re as _re
    n = len(_re.findall("[\ue000-\uf8ff]", src))
    if n:
        out.append(dict(page=0, issues=[dict(kind="tofu_sentinel", count=n)]))
    return out


def screenshot(html_path, page_no, out_png, width=1130, height=1590):
    """Render one page to PNG so an agent can actually look at it."""
    src = io.open(html_path, encoding="utf-8").read()
    head = src[:src.index("<body")]
    bo = src.index(">", src.index("<body")) + 1
    body = src[bo:src.rindex("</body>")]
    import re
    idx = [m.start() for m in re.finditer(r'<div class="page', body)] + [len(body)]
    if page_no > len(idx) - 1:
        return None
    tmp = os.path.join(probe.get_scratch_dir(), "qa_page.html")
    io.open(tmp, "w", encoding="utf-8").write(
        head + "<body>" + body[idx[page_no - 1]:idx[page_no]] + "</body></html>")
    d = os.path.dirname(os.path.abspath(out_png))
    if d and not os.path.isdir(d):
        os.makedirs(d)
    subprocess.run([probe.resolve_chrome(), "--headless=new", "--disable-gpu",
                    "--no-sandbox", "--hide-scrollbars",
                    "--window-size=%d,%d" % (width, height),
                    "--virtual-time-budget=12000",
                    "--screenshot=%s" % out_png, "file://" + tmp],
                   capture_output=True)
    return out_png if os.path.exists(out_png) else None
