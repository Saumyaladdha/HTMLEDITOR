# -*- coding: utf-8 -*-
"""
_step — the small amount of plumbing every step shares.

Kept deliberately thin. A step should read as: load the previous artifact,
do one job, record what it could not decide, save the next artifact. If a
step needs more scaffolding than this, the step is doing two jobs.
"""
import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "book", "util"))
import bootstrap                                        # noqa: E402,F401
sys.path.insert(0, ROOT)

from book.core import artifact                          # noqa: E402


def args(**extra):
    ap = argparse.ArgumentParser()
    ap.add_argument("--md", default=os.path.join(ROOT, "content", "21_figures_final.md"))
    ap.add_argument("--stem", default="chapter-01")
    ap.add_argument("--quiet", action="store_true")
    # EVERY step accepts --subject, whether or not it uses one. run_all
    # passes the same flags to all seventeen, so a step that rejected an
    # unknown argument would abort the run — and which steps care about the
    # subject will change as the biology profile grows.
    ap.add_argument("--subject", default=None,
                    choices=["physics", "biology", "chemistry", "maths", "arts", "economics"])
    for name, kw in extra.items():
        ap.add_argument("--" + name.replace("_", "-"), **kw)
    return ap.parse_args()


def head(step, note=""):
    print("%s%s" % (step, ("  —  " + note) if note else ""))


def line(ok, label, detail=""):
    mark = "ok " if ok is True else ("XX " if ok is False else "-- ")
    print("  %s %-22s %s" % (mark, label, detail))


def finish(stem, step, status, open_items=None, question="", **fields):
    """Publish the review queue and record the step's outcome."""
    n_open = len(open_items or [])
    artifact.write_open(stem, step, open_items or [], question)
    artifact.report(stem, step, status, open_items=n_open, **fields)
    if n_open:
        line(None, "needs review",
             "%d item(s) -> build/%s/review/%s.open.json" % (n_open, stem, step))
        print("     agent:  pipeline/subjects/<subject>/%s/SKILL.md   (or /%s in Claude Code)"
              % (step, step))
    if status == "fail":
        sys.exit(1)
