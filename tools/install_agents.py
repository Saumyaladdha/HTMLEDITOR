#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
install_agents — make this project's agents visible to Claude Code.

The agents ARE part of the codebase. Each one lives next to the step it
governs:

    pipeline/step03_content_tagger/run.py       the deterministic core
    pipeline/subjects/<subject>/step03_content_tagger/SKILL.md   what its agent decides

That is the canonical copy — versioned, reviewable, and it travels with the
project. Claude Code, though, discovers skills in a `.claude/skills/`
directory, so this script copies each `SKILL.md` there as a `SKILL.md`.

    python3 tools/install_agents.py             # install into this project
    python3 tools/install_agents.py --user      # into ~/.claude/skills (all projects)
    python3 tools/install_agents.py --target ..  # into a parent repo root
    python3 tools/install_agents.py --check     # has anything drifted?

Anyone you send this folder to runs the first command once and their own
Claude Code sees every agent in the pipeline. Nothing is tied to a machine or an
account.

Edit `pipeline/subjects/<subject>/<step>/SKILL.md` and re-run. Never edit the
installed copy —
`--check` will tell you when someone has.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "book", "util"))
import bootstrap                                   # noqa: E402,F401 — utf-8 stdout

import argparse                                    # noqa: E402
import filecmp                                     # noqa: E402
import io                                          # noqa: E402
import re                                          # noqa: E402
import shutil                                      # noqa: E402

PIPELINE = os.path.join(ROOT, "pipeline")
SUBJECTS = os.path.join(PIPELINE, "subjects")


def sources(subject="physics"):
    """The SKILL.md for each step, for one subject.

    The instructions are per-subject and live under
    `pipeline/subjects/<subject>/<step>/SKILL.md`; the CODE each step runs is
    shared, one `pipeline/<step>/run.py` for both. Physics and biology ask
    different things of the same seventeen steps — physics has 583 LaTeX
    commands and सूत्र panels to split, biology has none of either and a
    figure brief per plate that must never be printed — but a bug in the
    packer is a bug for both, so there is exactly one packer.
    """
    root = os.path.join(SUBJECTS, subject)
    if not os.path.isdir(root):
        sys.exit("no such subject: %s (looked in %s)" % (subject, SUBJECTS))
    out = []
    for name in sorted(os.listdir(root)):
        p = os.path.join(root, name, "SKILL.md")
        if os.path.isfile(p):
            out.append((name, p))
    return out


def known_subjects():
    if not os.path.isdir(SUBJECTS):
        return []
    return sorted(d for d in os.listdir(SUBJECTS)
                  if os.path.isdir(os.path.join(SUBJECTS, d)))


def check_frontmatter(path):
    """A skill needs `name:` and `description:` or Claude Code ignores it."""
    text = io.open(path, encoding="utf-8").read()
    if not text.startswith("---"):
        return "no frontmatter block"
    head = text.split("---", 2)[1]
    for key in ("name:", "description:"):
        if key not in head:
            return "frontmatter is missing %s" % key
    m = re.search(r'^name:\s*(\S+)', head, re.M)
    folder = os.path.basename(os.path.dirname(path))
    if m and m.group(1) != folder:
        return "frontmatter name %r does not match folder %r" % (m.group(1), folder)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--copy", action="store_true",
                    help="copy instead of symlinking — only for a target on "
                         "another filesystem, where a link cannot reach back")
    ap.add_argument("--subject", default="physics",
                    help="which subject's instructions to install "
                         "(default: physics)")
    ap.add_argument("--target", default=None,
                    help="project root to install into (default: this project)")
    ap.add_argument("--user", action="store_true",
                    help="install into ~/.claude/skills instead, for every project")
    ap.add_argument("--check", action="store_true",
                    help="report drift instead of installing")
    a = ap.parse_args()

    if a.user:
        dest_root = os.path.join(os.path.expanduser("~"), ".claude", "skills")
    else:
        base = os.path.abspath(a.target) if a.target else ROOT
        dest_root = os.path.join(base, ".claude", "skills")

    src = sources(a.subject)
    if not src:
        sys.exit("no pipeline/subjects/%s/*/SKILL.md found — is %s the right "
                 "project?" % (a.subject, ROOT))
    print("  subject: %s   (available: %s)"
          % (a.subject, ", ".join(known_subjects())))

    bad = [(n, check_frontmatter(p)) for n, p in src]
    bad = [(n, why) for n, why in bad if why]
    for n, why in bad:
        print("  !! %-38s %s" % (n, why))

    if a.check:
        # WHAT IS WORTH CHECKING CHANGED WHEN COPIES BECAME LINKS.
        #
        # "The installed copy was edited" was the whole point of this mode
        # while installing meant copying. A symlink cannot drift from its own
        # target, so that count is now always zero and reporting it would
        # imply a check is being made that is not.
        #
        # What CAN be wrong instead: a step not installed at all, a link left
        # pointing at a different subject's instructions after a switch, or a
        # stale real file left behind by an older --copy install.
        missing, wrong_subject, stale_copy = [], [], []
        for name, path in src:
            inst = os.path.join(dest_root, name, "SKILL.md")
            if not os.path.exists(inst) and not os.path.islink(inst):
                missing.append(name)
            elif os.path.islink(inst):
                if os.path.realpath(inst) != os.path.realpath(path):
                    wrong_subject.append(
                        "%s -> %s" % (name, os.readlink(inst)))
            elif not filecmp.cmp(path, inst, shallow=False):
                stale_copy.append(name)
        print("check: %s" % dest_root)
        print("  %d step(s) for subject %s" % (len(src), a.subject))
        print("  %d not installed" % len(missing))
        print("  %d pointing at other instructions" % len(wrong_subject))
        print("  %d stale real file(s) from an older --copy install"
              % len(stale_copy))
        for n in missing + wrong_subject + stale_copy:
            print("     - %s" % n)
        sys.exit(1 if (missing or wrong_subject or stale_copy or bad) else 0)

    n = 0
    for name, path in src:
        d = os.path.join(dest_root, name)
        if not os.path.isdir(d):
            os.makedirs(d)
        dest = os.path.join(d, "SKILL.md")
        # A SYMLINK, NOT A COPY.
        #
        # Claude Code discovers skills only at `.claude/skills/<name>/SKILL.md`
        # — it will not read pipeline/subjects/…/SKILL.md — so something has
        # to sit at that path. A copy meant the same text existed twice and
        # could drift, which is exactly what this script's own `--check` mode
        # was for: "the installed copy was edited". Link it instead and there
        # is one file with two names; editing either is editing it, and drift
        # is not possible rather than merely detected.
        #
        # The source file is named SKILL.md too, so the link is name for name.
        if os.path.islink(dest) or os.path.exists(dest):
            os.remove(dest)
        if a.copy:
            shutil.copyfile(path, dest)
        else:
            os.symlink(os.path.relpath(path, d), dest)
        n += 1

    print("installed %d agent(s) -> %s%s"
          % (n, dest_root, "" if a.copy else "   (symlinked, not copied)"))
    print()
    print("  Claude Code will now offer them as /step01_md_reader ... /step17_final_verifier.")
    print("  Edit pipeline/subjects/%s/<step>/SKILL.md and re-run this to "
          "update." % a.subject)
    if bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
