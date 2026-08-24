import logging
import os
import shutil
import subprocess
import tempfile
import uuid

logger = logging.getLogger("book_editor.flatten")

# --------------------------------------------------------------------------
# Rendering a script-driven document into editable static HTML.
#
# Some single-file exports carry no editable markup at all — the file is a
# self-extracting bundle whose visible content is produced by JavaScript on
# load (see html_ingest.is_script_rendered). An editor cannot execute that
# script: the canvas is same-origin with the app, so running untrusted code
# there would hand it the user's session tokens. The document therefore shows
# as a single "This page requires JavaScript" line and nothing can be edited.
#
# Rendering it ONCE, server-side, in a throwaway headless browser, and storing
# the resulting static DOM solves both halves: the script never runs anywhere
# near a user session, and what gets stored is ordinary HTML the editor
# already handles well.
#
# The original upload is always kept separately (Book.original_s3_key), so
# this is additive — nothing is destroyed by choosing to flatten.
# --------------------------------------------------------------------------

_MAC_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
]

# Injected before rendering. Copies each shadow root's content into the light
# DOM, because `documentElement.outerHTML` never includes shadow content — a
# component-based page would otherwise flatten to an empty shell.
_FLATTEN_SCRIPT = """
<script>
(function () {
  function inlineShadowRoots(root) {
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.shadowRoot) {
        inlineShadowRoots(el.shadowRoot);
        var holder = document.createElement('div');
        holder.setAttribute('data-flattened-shadow', '1');
        holder.innerHTML = el.shadowRoot.innerHTML;
        el.appendChild(holder);
      }
    }
  }
  function finish() {
    try { inlineShadowRoots(document); } catch (e) {}
    // Scripts have done their job; leaving them in would re-run on every
    // subsequent load and overwrite whatever the user edits.
    var scripts = document.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) scripts[i].remove();
    document.documentElement.setAttribute('data-flattened', '1');
  }
  if (document.readyState === 'complete') setTimeout(finish, %(settle)d);
  else window.addEventListener('load', function () { setTimeout(finish, %(settle)d); });
})();
</script>
"""


class FlattenUnavailable(RuntimeError):
    """No headless browser available — the caller should store the original
    unchanged and tell the user, rather than failing the upload."""


def resolve_chrome() -> str:
    """Same resolution order as HTML_Automation/chrome_util.py, which the
    pagination and PDF steps already rely on."""
    env = os.environ.get("PIPELINE_CHROME_BIN") or os.environ.get("BOOK_EDITOR_CHROME_BIN")
    if env and os.path.exists(env):
        return env
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        found = shutil.which(name)
        if found:
            return found
    for path in _MAC_CANDIDATES:
        if os.path.exists(path):
            return path
    raise FlattenUnavailable("No Chrome/Chromium binary found")


def flatten_html(html: str, settle_ms: int = 1500, timeout_s: int = 90) -> str:
    """Renders `html` in headless Chrome and returns the resulting static DOM.

    `settle_ms` is a pause AFTER load before snapshotting, giving a framework
    that renders asynchronously (React mounting, fonts resolving, a fetch
    completing) time to finish. `--virtual-time-budget` makes that pause cost
    no real wall-clock time — the browser fast-forwards its own clock.
    """
    chrome = resolve_chrome()

    workdir = tempfile.mkdtemp(prefix="book_editor_flatten_")
    source = os.path.join(workdir, f"{uuid.uuid4().hex}.html")
    try:
        prepared = _inject_flattener(html, settle_ms)
        with open(source, "w", encoding="utf-8") as handle:
            handle.write(prepared)

        argv = [
            chrome,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            # Isolated profile: never touch the operator's real Chrome
            # profile, cookies, extensions or open session.
            f"--user-data-dir={os.path.join(workdir, 'profile')}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-sync",
            "--disable-extensions",
            f"--virtual-time-budget={settle_ms + 20000}",
            "--dump-dom",
            f"file://{source}",
        ]
        rendered = _dump_dom(argv, timeout_s)
        if not rendered.strip():
            raise FlattenUnavailable("Headless render produced no output")
        return rendered
    except FileNotFoundError as exc:
        raise FlattenUnavailable(f"Could not run {chrome}") from exc
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def _dump_dom(argv: list[str], timeout_s: int) -> str:
    """Runs Chrome's --dump-dom and returns the document.

    Deliberately NOT `subprocess.run`: with an isolated `--user-data-dir`,
    this Chrome writes the complete DOM to stdout and then keeps running
    instead of exiting, so waiting for process exit reliably burns the whole
    timeout and then reports failure — even though the output arrived within
    a couple of seconds.

    So stdout is consumed on a reader thread and the process is stopped as
    soon as the document is complete (`</html>` seen) or the deadline passes.
    Whatever was read by then is returned; the caller validates it.
    """
    import threading

    process = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    chunks: list[bytes] = []
    done = threading.Event()

    def read_stdout():
        try:
            assert process.stdout is not None
            while True:
                # read1, NOT read: BufferedReader.read(n) blocks until it has
                # exactly n bytes or sees EOF, and this Chrome never closes
                # stdout. The final partial chunk — the one containing
                # </html> — would therefore never be returned, so the
                # completion check below could never fire and every render
                # burned the full timeout despite having finished in seconds.
                chunk = process.stdout.read1(65536)
                if not chunk:
                    break
                chunks.append(chunk)
                # Check across the last two chunks so a </html> split by a
                # chunk boundary is still detected.
                if b"</html>" in b"".join(chunks[-2:]):
                    break
        except Exception:
            pass
        finally:
            done.set()

    reader = threading.Thread(target=read_stdout, daemon=True)
    reader.start()
    done.wait(timeout=timeout_s)

    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()

    return b"".join(chunks).decode("utf-8", errors="replace")


def _inject_flattener(html: str, settle_ms: int) -> str:
    script = _FLATTEN_SCRIPT % {"settle": settle_ms}
    lowered = html.lower()
    index = lowered.rfind("</body>")
    if index == -1:
        return html + script
    return html[:index] + script + html[index:]


def flatten_if_needed(html: str) -> tuple[str, str | None]:
    """Returns (html_to_store, note).

    `note` is a human-readable message when something notable happened —
    either the document was flattened, or it needed flattening and couldn't
    be. Never raises: a failure to flatten must not fail the upload, because
    storing the original unchanged is always a valid outcome.
    """
    try:
        rendered = flatten_html(html)
    except FlattenUnavailable as exc:
        logger.warning("flatten unavailable: %s", exc)
        return html, (
            "This document builds its content with JavaScript, and this server has no "
            "headless browser available to convert it. It has been stored unchanged, but "
            "will appear almost empty in the editor."
        )
    except Exception:
        logger.exception("unexpected error while flattening")
        return html, (
            "This document builds its content with JavaScript and could not be converted. "
            "It has been stored unchanged."
        )

    return rendered, (
        "This document built its content with JavaScript, so it was rendered once and "
        "stored as ordinary HTML you can edit. The original file is kept unchanged."
    )
