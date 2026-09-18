# -*- coding: utf-8 -*-
"""
ARTIFACT — the chain that connects the seventeen steps.

Every step reads one JSON artifact and writes the next. Nothing is passed
in memory between steps, which is what makes the pipeline granular: any
step can be re-run alone, its input inspected, its output diffed.

    build/<stem>/artifacts/01_read.json
                           02_validated.json
                           ...
                           17_final.json

REVIEW QUEUES — how the agents plug in
--------------------------------------
A step's deterministic core runs first and does everything it can decide
confidently. Whatever it cannot, it appends to a REVIEW QUEUE:

    build/<stem>/review/03_content_tagger.open.json      <- questions for the agent
    build/<stem>/review/03_content_tagger.decisions.json <- the agent's answers

On the next run the step reads the decisions file and applies it. So an
agent's judgement is a persisted artifact, not something re-derived on
every build — which means builds stay reproducible, decisions are
reviewable in a diff, and a step never blocks waiting for a model.

`open` items each carry a stable `id`, so a decision keeps applying as
long as the underlying content is unchanged.
"""
import hashlib
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def paths(stem):
    base = os.path.join(ROOT, "build", stem)
    return dict(base=base,
                artifacts=os.path.join(base, "artifacts"),
                review=os.path.join(base, "review"),
                decisions=os.path.join(ROOT, "decisions", stem),
                out=os.path.join(ROOT, "build"))


def _ensure(d):
    if d and not os.path.isdir(d):
        os.makedirs(d)


def save(stem, name, data):
    p = paths(stem)
    _ensure(p["artifacts"])
    f = os.path.join(p["artifacts"], name + ".json")
    io.open(f, "w", encoding="utf-8").write(
        json.dumps(data, ensure_ascii=False, indent=1))
    return f


def load(stem, name, required=True):
    f = os.path.join(paths(stem)["artifacts"], name + ".json")
    if not os.path.exists(f):
        if required:
            raise SystemExit(
                "missing artifact %s — run the earlier step first "
                "(python3 pipeline/run_all.py --only-up-to %s)" % (f, name))
        return None
    return json.load(io.open(f, encoding="utf-8"))


# --------------------------------------------------------------------------
# review queues
# --------------------------------------------------------------------------
def item_id(*parts):
    """Stable id for a review item — survives re-runs, changes with content."""
    return hashlib.md5("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()[:12]


def write_open(stem, step, items, question=""):
    """Publish what this step could not decide. Empty list clears the queue."""
    p = paths(stem)
    _ensure(p["review"])
    f = os.path.join(p["review"], "%s.open.json" % step)
    io.open(f, "w", encoding="utf-8").write(json.dumps(
        dict(step=step, question=question, count=len(items), items=items),
        ensure_ascii=False, indent=1))
    return f


def read_decisions(stem, step):
    """-> {item_id: decision}. Missing file is normal, not an error.

    Decisions are answers an AGENT gave, and they must outlive the build.
    They used to be read only from `build/<stem>/review/`, which every
    `rm -rf build` wipes — the cover's stat tiles silently degraded to a
    plain list the first time that happened, with nothing reporting it.
    `decisions/<stem>/` is the durable home and wins; the build path is
    still read so an in-flight review round keeps working, and so a project
    zipped mid-run does not lose answers.
    """
    f = os.path.join(paths(stem)["decisions"], "%s.decisions.json" % step)
    if not os.path.exists(f):
        f = os.path.join(paths(stem)["review"], "%s.decisions.json" % step)
    if not os.path.exists(f):
        return {}
    try:
        raw = json.load(io.open(f, encoding="utf-8"))
    except Exception:
        return {}
    if isinstance(raw, dict) and "decisions" in raw:
        raw = raw["decisions"]
    if isinstance(raw, list):
        return {d.get("id"): d for d in raw if d.get("id")}
    return raw or {}


def report(stem, step, status, **fields):
    """One line per step, machine-readable, for step17 to aggregate."""
    p = paths(stem)
    _ensure(p["artifacts"])
    f = os.path.join(p["artifacts"], "_reports.json")
    try:
        all_r = json.load(io.open(f, encoding="utf-8"))
    except Exception:
        all_r = {}
    all_r[step] = dict(status=status, **fields)
    io.open(f, "w", encoding="utf-8").write(
        json.dumps(all_r, ensure_ascii=False, indent=1))
    return all_r


def load_reports(stem):
    f = os.path.join(paths(stem)["artifacts"], "_reports.json")
    try:
        return json.load(io.open(f, encoding="utf-8"))
    except Exception:
        return {}
