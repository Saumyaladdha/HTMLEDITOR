#!/bin/sh
# selftest — prove the pipeline is content-driven, not chapter-driven.
#
# Builds every chapter in content/ through all 17 steps. Chapter 17 groups
# Part 2 by YEAR, chapter 02 groups it by MARKS — same code, no changes.
# Fails if any step hard-fails.
set -e
cd "$(dirname "$0")/.."
for md in content/*_reader_edition.md; do
  stem="chapter-$(basename "$md" | cut -d_ -f1)"
  echo "================ $md -> $stem"
  python3 pipeline/run_all.py --md "$md" --stem "$stem"
done
# The editor learns this pipeline's vocabulary from the element library, so
# the manifest has to be rebuilt whenever the library changes. Regenerating
# here means it can never silently drift out of date — which is exactly how
# the editor ended up recognising NONE of the 145 classes a chapter carries.
# Skipped without complaint when the editor isn't checked out beside us.
if [ -d ../book_editor/frontend/src/editor ]; then
  python3 tools/export_editor_manifest.py
  # The art library is only re-exported when the decorator PNGs change, and
  # it needs Pillow, which the pipeline itself does not. Skipped quietly when
  # either is missing rather than failing a build over optional tooling.
  if [ ! -f ../book_editor/frontend/src/editor/decoratorLibrary.json ]; then
    python3 tools/export_decorator_library.py ||       echo "  (decorator library not exported — needs Pillow; art panel will be empty)"
  fi
fi

echo "selftest: OK"
