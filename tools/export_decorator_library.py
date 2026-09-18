# -*- coding: utf-8 -*-
"""
EXPORT DECORATOR LIBRARY — make the 130 decorators reachable from the editor.

`decorators/cropped/` holds 130 pieces of art in six categories, and
`book/decorators/` holds a real policy for placing them:

    DECORATION DENSITY IS INVERSELY PROPORTIONAL TO CONTENT DENSITY.

None of it is used. `slots.py` says so in its own docstring — "nothing calls
this in the default build" — and `assets/manifest.json` does not exist, so
every slot resolves to nothing and all 130 files sit unread. Choosing art for
a page is a judgement call, which is exactly the kind of decision the pipeline
defers to an agent and a human is better at anyway. So the editor is where
this belongs.

The source PNGs are ~234KB each (30MB total) for images only ~200-260px
across — they are near their display size already, just encoded wastefully.
Re-encoded as WebP they come to 13% of that, so the entire library is ~1.5MB
and one decorator inlines into a chapter as ~14KB of base64.

    python3 tools/export_decorator_library.py

Writes book_editor/frontend/public/decorators/<category>/<name>.webp (full),
        book_editor/frontend/public/decorators/thumbs/<category>/<name>.webp,
        book_editor/frontend/src/editor/decoratorLibrary.json
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "decorators", "cropped")
EDITOR = os.path.join(os.path.dirname(ROOT), "book_editor", "frontend")
OUT_ASSETS = os.path.join(EDITOR, "public", "decorators")
OUT_JSON = os.path.join(EDITOR, "src", "editor", "decoratorLibrary.json")

THUMB_EDGE = 128
FULL_QUALITY = 88
THUMB_QUALITY = 80

# What each folder is FOR, in the words a teacher would use. The folder name
# alone ("teacher-callouts") does not say that these are speech-bubble badges
# rather than pictures of a teacher.
CATEGORIES = {
    "students":        ("Students", "Boys and girls reacting — cheering, thinking, confused."),
    "teacher-poses":   ("Teacher", "A teacher explaining, pointing, celebrating."),
    "teacher-callouts": ("Callout badges", "Ready-made labels: 'asked in exam', 'common mistake'."),
    "classroom":       ("Classroom", "Desks, boards, bells, bookshelves."),
    "science":         ("Science", "Beakers, magnets, circuits, cells."),
    "study-objects":   ("Study objects", "Books, clocks, lamps, backpacks."),
}

# Rough role, so the editor can honour the placement policy without having to
# guess from a filename. A character needs real room (>=520px of slack); a
# small doodle can sit in far less.
CHARACTER_CATEGORIES = {"students", "teacher-poses"}


def label_for(stem):
    return stem.replace("-", " ").replace("_", " ").strip().capitalize()


def main():
    try:
        from PIL import Image
    except ImportError:
        sys.stderr.write(
            "export_decorator_library: needs Pillow.\n"
            "  pip install Pillow   (the pipeline itself does not need it —\n"
            "  this tool is only run when the decorator art changes)\n")
        return 1

    if not os.path.isdir(SRC):
        sys.stderr.write("no decorators at %s\n" % SRC)
        return 1
    if not os.path.isdir(os.path.join(EDITOR, "src")):
        sys.stderr.write("editor not found at %s\n" % EDITOR)
        return 1

    items, src_bytes, out_bytes = [], 0, 0
    for cat in sorted(os.listdir(SRC)):
        cdir = os.path.join(SRC, cat)
        if not os.path.isdir(cdir):
            continue
        label, blurb = CATEGORIES.get(cat, (label_for(cat), ""))
        for fn in sorted(os.listdir(cdir)):
            if not fn.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                continue
            stem = os.path.splitext(fn)[0]
            src_path = os.path.join(cdir, fn)
            src_bytes += os.path.getsize(src_path)

            im = Image.open(src_path).convert("RGBA")

            full_dir = os.path.join(OUT_ASSETS, cat)
            thumb_dir = os.path.join(OUT_ASSETS, "thumbs", cat)
            for d in (full_dir, thumb_dir):
                if not os.path.isdir(d):
                    os.makedirs(d)

            full_path = os.path.join(full_dir, stem + ".webp")
            im.save(full_path, "WEBP", quality=FULL_QUALITY, method=6)
            out_bytes += os.path.getsize(full_path)

            th = im.copy()
            th.thumbnail((THUMB_EDGE, THUMB_EDGE), Image.LANCZOS)
            th.save(os.path.join(thumb_dir, stem + ".webp"),
                    "WEBP", quality=THUMB_QUALITY, method=6)

            items.append({
                "id": "%s/%s" % (cat, stem),
                "name": label_for(stem),
                "category": cat,
                "categoryLabel": label,
                # Served by Vite from public/ — the panel browses these. The
                # art is inlined as base64 only at the moment it is placed, so
                # a chapter stays self-contained without the editor bundle
                # carrying 30MB it mostly will not use.
                "url": "/decorators/%s/%s.webp" % (cat, stem),
                "thumb": "/decorators/thumbs/%s/%s.webp" % (cat, stem),
                "width": im.width,
                "height": im.height,
                # `character` art is a person and needs real room; `doodle` is
                # an object and can sit in a much smaller gap. This is the
                # distinction book/decorators/policy.py already draws.
                "role": "character" if cat in CHARACTER_CATEGORIES else "doodle",
            })

    lib = {
        "version": 1,
        "source": "HTML_Automation/decorators/cropped",
        "note": "GENERATED by tools/export_decorator_library.py — do not edit by hand.",
        "categories": [
            {"id": c,
             "label": CATEGORIES.get(c, (label_for(c), ""))[0],
             "blurb": CATEGORIES.get(c, ("", ""))[1],
             "count": sum(1 for i in items if i["category"] == c)}
            for c in sorted({i["category"] for i in items})
        ],
        "items": items,
    }
    io.open(OUT_JSON, "w", encoding="utf-8").write(
        json.dumps(lib, ensure_ascii=False, indent=1) + "\n")

    print("wrote %d decorator(s) in %d categories"
          % (len(items), len(lib["categories"])))
    print("  art   %s" % os.path.relpath(OUT_ASSETS, os.path.dirname(ROOT)))
    print("  index %s" % os.path.relpath(OUT_JSON, os.path.dirname(ROOT)))
    print("  %.1fMB source -> %.2fMB webp (%.0f%%)"
          % (src_bytes / 1048576.0, out_bytes / 1048576.0,
             100.0 * out_bytes / max(src_bytes, 1)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
