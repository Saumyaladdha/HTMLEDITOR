# -*- coding: utf-8 -*-
"""
BOOTSTRAP — make every entry point runnable as plain `python3 …`.

Imported first by `pipeline/run_all.py` and by every step. Two things go
wrong otherwise, and both were real on this machine:

1. `python3` on PATH is 3.6 (pyenv). The pipeline needs 3.7+ for
   `subprocess.run(capture_output=…)`. Instead of failing with a
   traceback from deep inside the paginator, we look for a newer
   interpreter and re-exec into it once.

2. Python 3.6 defaults stdout to ASCII, so the first `print()` of a Hindi
   chapter title dies with UnicodeEncodeError — a crash that looks like a
   content bug and is really an environment one.

Set PIPELINE_PYTHON to pin a specific interpreter and skip the search.
"""
import os
import sys

MIN = (3, 8)



_CANDIDATES = [
    "python3.13", "python3.12", "python3.11", "python3.10", "python3.9", "python3.8",
    "/opt/homebrew/bin/python3", "/usr/local/bin/python3", "/usr/bin/python3",
]
_GUARD = "PIPELINE_BOOTSTRAPPED"


def _utf8_stdout():
    for stream in ("stdout", "stderr"):
        s = getattr(sys, stream, None)
        try:
            if s and getattr(s, "encoding", "").lower() not in ("utf-8", "utf8"):
                s.reconfigure(encoding="utf-8")           # 3.7+
        except Exception:
            try:
                import codecs
                setattr(sys, stream, codecs.getwriter("utf-8")(s.buffer, "replace"))
            except Exception:
                pass


def _find_newer():
    import shutil
    import subprocess
    env = os.environ.get("PIPELINE_PYTHON")
    if env and os.path.exists(env):
        return env
    for name in _CANDIDATES:
        path = name if os.path.isabs(name) else shutil.which(name)
        if not path or not os.path.exists(path):
            continue
        try:
            out = subprocess.check_output(
                [path, "-c", "import sys;print('%d.%d' % sys.version_info[:2])"],
                stderr=subprocess.DEVNULL).decode().strip()
            major, minor = (int(x) for x in out.split("."))
        except Exception:
            continue
        if (major, minor) >= MIN:
            return path
    return None


def ensure():
    """Re-exec into a new-enough interpreter if this one is too old."""
    _utf8_stdout()
    if sys.version_info[:2] >= MIN:
        os.environ["PIPELINE_PYTHON"] = sys.executable
        return
    if os.environ.get(_GUARD):
        sys.exit("This pipeline needs Python %d.%d+ (running %d.%d) and the "
                 "re-exec already happened. Set PIPELINE_PYTHON to a newer "
                 "interpreter." % (MIN + sys.version_info[:2]))
    newer = _find_newer()
    if not newer:
        sys.exit("This pipeline needs Python %d.%d+; `python3` here is %d.%d and "
                 "no newer interpreter was found.\\nInstall one, or set "
                 "PIPELINE_PYTHON=/path/to/python3." % (MIN + sys.version_info[:2]))
    os.environ[_GUARD] = "1"
    os.environ["PIPELINE_PYTHON"] = newer
    sys.stderr.write("bootstrap: python3 is %d.%d, re-running under %s\\n"
                     % (sys.version_info[0], sys.version_info[1], newer))
    os.execv(newer, [newer] + sys.argv)


ensure()
