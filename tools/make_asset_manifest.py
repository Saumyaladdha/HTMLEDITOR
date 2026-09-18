#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build `assets/manifest.json` from the art in `decorators/cropped/`.

`book/decorators/slots.py` has always read this file, and it has never
existed: `load_manifest()` returned `{}`, so `apply()` bailed out on its
first line and every build reported `slots: 0/0` with no art placed. 130
files were sitting in `decorators/cropped/` unused.

A role maps to a LIST of files, so consecutive placements do not all pick
the same drawing. Roles are the ones `book/decorators/policy.py` names.
"""
import io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# A character is a person — it reads as someone talking to the reader. A
# doodle is an object; at 200px a flask or a globe still reads, a person
# does not.
ROLE_DIRS = {
    "character":  ["teacher-poses", "teacher-callouts", "students"],
    "doodle-lg":  ["science", "study-objects"],
    "doodle-md":  ["study-objects", "science"],
    "doodle-sm":  ["study-objects"],
}


def build():
    out = {}
    for role, dirs in ROLE_DIRS.items():
        files = []
        for d in dirs:
            full = os.path.join(ROOT, "decorators", "cropped", d)
            if not os.path.isdir(full):
                continue
            for name in sorted(os.listdir(full)):
                if name.lower().endswith((".png", ".webp", ".svg")):
                    files.append(os.path.join("decorators", "cropped", d, name))
        if files:
            out[role] = files
    return out


if __name__ == "__main__":
    man = build()
    path = os.path.join(ROOT, "assets", "manifest.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, "w", encoding="utf-8").write(
        json.dumps(man, ensure_ascii=False, indent=1) + "\n")
    for role, files in sorted(man.items()):
        print("  %-12s %d file(s)" % (role, len(files)))
    print("wrote %s" % os.path.relpath(path, ROOT))
