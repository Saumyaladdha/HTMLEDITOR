#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_all — the whole seventeen-step pipeline, one command.

    python3 pipeline/run_all.py
    python3 pipeline/run_all.py --md content/02_reader_edition.md --stem chapter-02
    python3 pipeline/run_all.py --from step09 --to step14      # re-run a slice
    python3 pipeline/run_all.py --only step12                  # one step

Every step reads one JSON artifact and writes the next, so any step can be
re-run alone against the artifact the previous one left behind. Nothing is
passed in memory.

    build/<stem>/artifacts/   the chain, one file per step
    build/<stem>/review/      what each step could not decide, for its agent
    build/<stem>.html         the finished book

Steps stop the run on a HARD failure (content loss, a clipped page, a
missing component). An open review queue is not a failure — it is work for
an agent, and the build carries on so you can look at the result.
"""
import os
import sys

sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "book", "util"))
import bootstrap                                        # noqa: E402,F401

import argparse                                         # noqa: E402
import subprocess                                       # noqa: E402
import time                                             # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable

STEPS = [
    "step01_md_reader",
    "step02_content_validator",
    "step03_content_tagger",
    "step04_content_namer",
    "step05_question_analyzer",
    "step06_latex_validator",
    "step07_formatting_agent",
    "step08_content_assignment",
    "step09_layout_analyzer",
    "step10_empty_space_analyzer",
    "step11_decorator_agent",
    "step12_table_formatter",
    "step13_css_generator",
    "step14_html_assembler",
    "step15_visual_qa_agent",
    "step16_content_integrity_verifier",
    "step17_final_verifier",
]

# steps that take the layout switches
LAYOUT_ARGS = {"step09_layout_analyzer"}


def resolve(spec):
    if not spec:
        return None
    for s in STEPS:
        if s == spec or s.startswith(spec) or s.split("_", 1)[1] == spec:
            return s
    sys.exit("unknown step %r — known: %s" % (spec, ", ".join(STEPS)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--md", default=os.path.join(ROOT, "content", "17_reader_edition.md"))
    ap.add_argument("--stem", default="chapter-01")
    ap.add_argument("--mode", default="a4", choices=["a4", "flow"])
    # WHICH SUBJECT'S RULES APPLY.
    #
    # Detected from the notation when not given, which is unambiguous on any
    # real chapter — the physics chapter carries 583 LaTeX commands, the
    # biology one none. The override exists for a chapter that is genuinely
    # mixed, and for testing that physics still builds as physics.
    ap.add_argument("--subject", default=None,
                    choices=["physics", "biology", "chemistry", "maths", "arts", "economics"],
                    help="default: detect from the markdown")
    ap.add_argument("--only-part", default="all", choices=["all", "part1", "part2"])
    ap.add_argument("--from", dest="start", default=None, help="e.g. step09")
    ap.add_argument("--to", dest="end", default=None)
    ap.add_argument("--only", default=None, help="run exactly one step")
    a = ap.parse_args()

    steps = STEPS
    if a.only:
        steps = [resolve(a.only)]
    else:
        if a.start:
            steps = steps[STEPS.index(resolve(a.start)):]
        if a.end:
            steps = steps[:steps.index(resolve(a.end)) + 1]

    common = ["--md", a.md, "--stem", a.stem]
    if a.subject:
        common += ["--subject", a.subject]
    print("run_all — %s -> %s — %d step(s)\n"
          % (os.path.basename(a.md), a.stem, len(steps)))

    failed = []
    for i, name in enumerate(steps, 1):
        extra = []
        if name in LAYOUT_ARGS:
            extra = ["--mode", a.mode, "--only", a.only_part]
        print("[%2d/%d] %s" % (i, len(steps), name))
        # `-u`, AND THE ELAPSED TIME.
        #
        # Each step is a SUBPROCESS, so `-u` on run_all itself does nothing
        # for the step's own output: CPython block-buffers stdout when it is
        # a pipe or a file, and a step that takes ten minutes prints nothing
        # until it exits. On a long step09 that is indistinguishable from a
        # hang — there was no way to tell which settle round it was on, or
        # whether it was making progress at all, without sampling the
        # process from outside.
        #
        # The per-step timing is the other half: "which step is slow" is the
        # first question asked whenever a build feels long, and answering it
        # should not require instrumenting anything.
        t0 = time.time()
        rc = subprocess.run([PY, "-u", os.path.join(ROOT, "pipeline", name, "run.py")]
                            + common + extra, cwd=ROOT).returncode
        print("       %s took %.1fs" % (name, time.time() - t0))
        print("")
        if rc != 0:
            failed.append(name)
            # A failure downstream of the layout is a REPORT, not a reason to
            # stop: the whole point of step17 is to show every finding at
            # once, and stopping at step16 hides the summary you need to act
            # on. Anything before the layout is different — later steps would
            # be reading a corrupt artifact — so those still halt.
            if STEPS.index(name) < STEPS.index("step09_layout_analyzer"):
                print("[%2d/%d] %s FAILED — stopping (later steps would read a "
                      "corrupt artifact).\n        artifacts so far: "
                      "build/%s/artifacts/" % (i, len(steps), name, a.stem))
                sys.exit(1)
            print("        ^ recorded; continuing so step17 can summarise\n")

    print("run_all — done: build/%s.html" % a.stem)
    if failed:
        print("run_all — %d step(s) reported a hard failure: %s"
              % (len(failed), ", ".join(failed)))
        sys.exit(1)


if __name__ == "__main__":
    main()
