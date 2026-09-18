#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""step17_final_verifier — one verdict over everything the pipeline found."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _step import args, head, line, finish, artifact, ROOT           # noqa: E402
import json                                                          # noqa: E402

ORDER = ["step01_md_reader", "step02_content_validator", "step03_content_tagger",
         "step04_content_namer", "step05_question_analyzer", "step06_latex_validator",
         "step07_formatting_agent", "step08_content_assignment",
         "step09_layout_analyzer", "step10_empty_space_analyzer",
         "step11_decorator_agent", "step12_table_formatter", "step13_css_generator",
         "step14_html_assembler", "step15_visual_qa_agent",
         "step16_content_integrity_verifier"]

a = args()
reports = artifact.load_reports(a.stem)
asm = artifact.load(a.stem, "14_assembled", required=False) or {}

head("step17_final_verifier", a.stem)
failed, review, missing = [], [], []
for step in ORDER:
    r = reports.get(step)
    if not r:
        missing.append(step)
        line(None, step.split("_", 1)[1], "did not run")
        continue
    ok = r["status"] == "ok"
    if not ok:
        failed.append(step)
    n = r.get("open_items", 0)
    if n:
        review.append((step, n))
    extra = " · ".join("%s=%s" % (k, v) for k, v in r.items()
                       if k not in ("status", "open_items"))[:70]
    line(ok, step.split("_", 1)[1],
         ("%d for review · " % n if n else "") + extra)

print()
line(not failed, "hard failures", "%d" % len(failed))
line(not review, "awaiting an agent", "%d step(s), %d item(s)"
     % (len(review), sum(n for _, n in review)))
line(not missing, "steps run", "%d/%d" % (len(ORDER) - len(missing), len(ORDER)))
if asm:
    line(True, "output", "%s · %d pages · %.1f MB"
         % (asm.get("html"), asm.get("pages", 0), asm.get("bytes", 0) / 1e6))

verdict = "fail" if failed else ("review" if review else "pass")
print("\n  VERDICT: %s" % verdict.upper())
if review:
    print("  open queues:")
    for step, n in review:
        print("    %-38s %d  ->  build/%s/review/%s.open.json"
              % (step, n, a.stem, step))

artifact.save(a.stem, "17_final", dict(verdict=verdict, failed=failed,
                                       review=dict(review), missing=missing,
                                       reports=reports))
finish(a.stem, "step17_final_verifier", "fail" if failed else "ok", [],
       question="", verdict=verdict)
