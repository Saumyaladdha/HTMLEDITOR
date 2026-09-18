#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
skill_pdf_exporter — print / PDF export
==========================================

    python3 skills/skill_pdf_exporter/export_pdf.py --in chapter-01-paginated.html --out chapter-01.pdf

Per §14 of Book-HTML-Automation-Pipeline.md: wraps the headless-Chrome
print-to-pdf invocation with the two rules NIYAM.md already documents as
load-bearing:

  - `--virtual-time-budget` must be at least 15000ms (NIYAM #14) — a
    shorter budget can fire before Baloo 2/Kalam webfonts finish loading
    and silently blank out every label set in them. calibrate.py used to
    use 12000 here; that was a bug, not a second convention (fixed
    separately in calibrate.py itself).
  - print scaling comes from `.page { zoom: ... }` in the CSS, never
    `width: 210mm` (NIYAM #15) — nothing to do here, just don't reintroduce
    a --print-to-pdf flag that fights it (e.g. don't add --force-color-profile
    tricks that imply a different paper-size handling).

Uses the portable Chrome-binary resolution from chrome_util.py — the same
one measure.py/calibrate.py use — instead of a machine-specific hardcoded
path.
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)
import chrome_util

MIN_VIRTUAL_TIME_BUDGET = 15000


def export_pdf(in_path, out_path, virtual_time_budget=MIN_VIRTUAL_TIME_BUDGET):
    if virtual_time_budget < MIN_VIRTUAL_TIME_BUDGET:
        raise SystemExit(
            f"--virtual-time-budget={virtual_time_budget} is below the documented safe "
            f"minimum of {MIN_VIRTUAL_TIME_BUDGET}ms (NIYAM #14) — refusing to risk blank "
            f"webfont labels. Pass a larger value if you really need to.")

    chrome = chrome_util.resolve_chrome()
    in_url = f"file://{os.path.abspath(in_path)}"
    result = subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={os.path.abspath(out_path)}",
         f"--virtual-time-budget={virtual_time_budget}", in_url],
        capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(out_path):
        raise SystemExit(f"Chrome print-to-pdf failed:\n{result.stderr}")
    return out_path


def pdf_page_count(pdf_path):
    data = open(pdf_path, "rb").read()
    return len(re.findall(rb"/Type\s*/Page[^s]", data))


def html_page_div_count(html_path):
    """Counts real `.page` divs only — strips <style> blocks first, since a
    packaged (CSS-inlined) file can contain literal example markup like
    `<div class="page" style="...">` inside an element's own CSS header
    comment, which would otherwise inflate this count."""
    html = open(html_path, encoding="utf-8").read()
    html = re.sub(r"<style\b.*?</style>", "", html, flags=re.S)
    # Match `class="page"` and `class="page keep"`, with or without a style
    # attribute. The old form required ` style=` and silently reported 0 for
    # the new renderer's output — which made the div-vs-sheet check, the one
    # thing this function exists for, always pass.
    return len(re.findall(r'<div class="page(?:\s[^"]*)?"', html))


def main():
    parser = argparse.ArgumentParser(description="Export a chapter HTML file to PDF.")
    parser.add_argument("--in", dest="in_path", required=True)
    parser.add_argument("--out", dest="out_path", required=True)
    parser.add_argument("--virtual-time-budget", type=int, default=MIN_VIRTUAL_TIME_BUDGET)
    args = parser.parse_args()

    export_pdf(args.in_path, args.out_path, args.virtual_time_budget)
    n_divs = html_page_div_count(args.in_path)
    n_pdf_pages = pdf_page_count(args.out_path)

    print(f"banaya: {args.out_path}")
    print(f"  {n_divs} `.page` div · {n_pdf_pages} A4 sheet(s) in the PDF")
    if n_divs != n_pdf_pages:
        print(f"  ⚠️  mismatch! pagination math and the print engine disagree "
              f"(NIYAM #15 — check for a `width: 210mm`-style regression, or a font/size change "
              f"that shifted the `.page` zoom ratio).")


if __name__ == "__main__":
    main()
