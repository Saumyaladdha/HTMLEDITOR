#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHROME_UTIL — portable Chrome binary + scratch-dir resolution
===============================================================

measure.py / calibrate.py / skill_pdf_exporter all need (a) a headless
Chrome/Chromium binary and (b) a writable scratch directory to render
throwaway HTML/PDF files into. Both used to be hardcoded to one specific
machine's Chrome.app path and one specific Claude Code sandbox's scratch
path — anywhere else, both fail closed (and a failed measure.py silently
falls back to the old character-count estimate, which is the exact
failure mode this whole pipeline exists to avoid — see NIYAM #11a).

Resolution order:
  CHROME  — $PIPELINE_CHROME_BIN env var, then `google-chrome`/`chromium`/
            `chromium-browser` on PATH, then the standard macOS
            Google Chrome / Chromium app paths (only if they exist).
  SCRATCH — $PIPELINE_SCRATCH_DIR env var, else a stable directory under
            the OS temp dir (created on first use, reused after that —
            not a fresh mkdtemp() per call).
"""
import os
import shutil
import sys

_MAC_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
]


def resolve_chrome():
    env = os.environ.get("PIPELINE_CHROME_BIN")
    if env:
        if not os.path.exists(env):
            sys.exit(f"PIPELINE_CHROME_BIN={env!r} set but does not exist")
        return env

    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        found = shutil.which(name)
        if found:
            return found

    for path in _MAC_CANDIDATES:
        if os.path.exists(path):
            return path

    raise SystemExit(
        "No Chrome/Chromium binary found. Set PIPELINE_CHROME_BIN to a headless-capable "
        "Chrome/Chromium executable, or install google-chrome/chromium on PATH."
    )


def get_scratch_dir():
    env = os.environ.get("PIPELINE_SCRATCH_DIR")
    if env:
        os.makedirs(env, exist_ok=True)
        return env

    import tempfile
    path = os.path.join(tempfile.gettempdir(), "html-automation-scratch")
    os.makedirs(path, exist_ok=True)
    return path
