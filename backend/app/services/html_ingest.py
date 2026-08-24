import re

# --------------------------------------------------------------------------
# Decoding uploads, and recognising documents whose content isn't in the file.
# --------------------------------------------------------------------------

_META_CHARSET_RE = re.compile(rb'<meta[^>]+charset=["\']?\s*([a-zA-Z0-9_\-]+)', re.IGNORECASE)
_XML_DECL_RE = re.compile(rb'<\?xml[^>]+encoding=["\']([a-zA-Z0-9_\-]+)["\']', re.IGNORECASE)

# Byte-order marks, checked before anything else — a BOM is authoritative.
_BOMS = [
    (b"\xef\xbb\xbf", "utf-8-sig"),
    (b"\xff\xfe\x00\x00", "utf-32-le"),
    (b"\x00\x00\xfe\xff", "utf-32-be"),
    (b"\xff\xfe", "utf-16-le"),
    (b"\xfe\xff", "utf-16-be"),
]

# Tried in order when nothing is declared. windows-1252 is last and never
# fails, which makes it the terminating fallback rather than a guess.
_FALLBACKS = ["utf-8", "windows-1252"]


def decode_html(raw: bytes) -> tuple[str, str]:
    """Decodes an uploaded file to text, returning (text, encoding_used).

    Uploads used to be decoded as UTF-8 only, and anything else was rejected
    outright as "not valid UTF-8 HTML". A large share of real HTML in
    existence — anything saved by an older editor, most pre-2010 pages, plenty
    of Windows tooling — is windows-1252 or ISO-8859-1, so that rule turned a
    perfectly readable document into an unexplained upload failure.

    Declared encodings are honoured; otherwise UTF-8 is tried first (correct
    for the overwhelming majority) and windows-1252 is the fallback, chosen
    because it maps every possible byte and therefore always succeeds.
    """
    for bom, encoding in _BOMS:
        if raw.startswith(bom):
            return raw.decode(encoding, errors="replace"), encoding

    declared = None
    head = raw[:4096]
    match = _META_CHARSET_RE.search(head) or _XML_DECL_RE.search(head)
    if match:
        declared = match.group(1).decode("ascii", errors="ignore").lower()

    candidates = ([declared] if declared else []) + _FALLBACKS
    for encoding in candidates:
        if not encoding:
            continue
        try:
            return raw.decode(encoding), encoding
        except (UnicodeDecodeError, LookupError):
            continue

    # Guaranteed to succeed: every byte is representable in latin-1.
    return raw.decode("latin-1"), "latin-1"


# --------------------------------------------------------------------------
# Script-rendered documents.
# --------------------------------------------------------------------------

_SCRIPT_RE = re.compile(r"<script\b[^>]*>(.*?)</script\s*>", re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")

# Markers used by the bundlers that produce single-file self-extracting pages.
_BUNDLER_MARKERS = ("__bundler/manifest", "__bundler/template", "__bundler_loading")

_NOSCRIPT_HINTS = (
    "requires javascript",
    "enable javascript",
    "javascript to display",
    "javascript is required",
)


_STYLE_RE = re.compile(r"<style\b[^>]*>.*?</style\s*>", re.IGNORECASE | re.DOTALL)


def visible_text_length(html: str) -> int:
    """Rough count of the text a reader would actually see — script bodies,
    style bodies and all markup removed, whitespace collapsed."""
    stripped = _SCRIPT_RE.sub(" ", html)
    stripped = _STYLE_RE.sub(" ", stripped)
    stripped = _TAG_RE.sub(" ", stripped)
    return len(" ".join(stripped.split()))


def script_payload_length(html: str) -> int:
    return sum(len(m.group(1)) for m in _SCRIPT_RE.finditer(html))


def is_script_rendered(html: str) -> bool:
    """True when the document's content is produced by JavaScript at runtime
    rather than present in the file.

    These exist and are common: a page exported from a single-file bundler
    ships as a `<div>This page requires JavaScript to display.</div>` plus
    several hundred KB of gzipped base64 modules that unpack and render a
    whole application on load. Opened in an editor — which must not execute
    untrusted scripts — such a file shows one sentence and nothing else, and
    there is genuinely nothing in the markup to edit.

    Detecting it is what lets the app say so, and offer to render the
    document into editable static HTML (see html_flatten), instead of
    presenting a blank canvas with no explanation.
    """
    lowered = html.lower()
    if any(marker.lower() in lowered for marker in _BUNDLER_MARKERS):
        return True

    visible = visible_text_length(html)
    scripts = script_payload_length(html)

    # A noscript-style apology as essentially the only visible text.
    if visible < 400 and any(hint in lowered for hint in _NOSCRIPT_HINTS):
        return True

    # Overwhelmingly script by weight, with almost nothing to read: the
    # thresholds are deliberately conservative so an ordinary page that
    # happens to carry analytics snippets is never misclassified.
    return scripts > 50_000 and visible < 500
