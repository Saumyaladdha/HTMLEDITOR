# -*- coding: utf-8 -*-
"""
Local image / external link -> a URL our own storage serves.

A figure's `ref` arrives in the source in whatever shape the chapter was
written in: a LOCAL PATH before the art exists on disk (nothing to show,
`components.figure` draws an empty plate for it), a local path that now
POINTS AT A REAL FILE, an inline `data:` URI, or an external link — a few
chapters carry raw `cdn.mathpix.com` crops from the OCR extraction step.
Only the first of those is meant to stay a placeholder forever; the rest are
a picture that belongs on the page, and none of them is something a browser
can be handed as-is and trusted to keep working:

  · a local path is not fetchable by a reader's browser at all
  · a mathpix crop is someone else's CDN, not durable, and not ours

`resolve_ref` is the ONE place that turns any of those into either a URL
this platform's own storage serves, or — if that upload cannot happen for
any reason — the ORIGINAL ref unchanged, which is exactly today's behaviour
(a dashed placeholder, or in mathpix's case the same external link that
already worked). Nothing about this file can make a build WORSE than before
it existed; every failure path falls back to the pre-existing behaviour.

CREDENTIALS. Read from the environment, never hardcoded, never logged, never
returned in an error message:

    AV_UPLOAD_USER_ID    the `userId` header
    AV_UPLOAD_TOKEN      the `token` header

The upload endpoint authenticates with a short-lived token obtained through
the platform's own phone/OTP login — a human step outside this pipeline, by
design; nothing here can obtain a token itself. Without both variables set,
every call is skipped and the pipeline falls back to today's behaviour, so a
machine with no credentials configured still builds exactly as before.

RESPONSE SHAPE. Not yet confirmed against a live call — see `_extract_url`.
The parser tries every key this class of upload API commonly uses; if the
real response uses a different one, that function is the one place to fix.
"""
import hashlib
import io
import json
import mimetypes
import os
import re
import urllib.error
import urllib.parse
import urllib.request

UPLOAD_HOST = ("https://platform-stage.arivihan.com/internal-metrics"
               "/secure/upload/api/v1/files")


def _upload_url():
    """The upload endpoint, with the destination folder read fresh each
    call so a `.env` edit or a changed `AV_UPLOAD_FOLDER` takes effect on
    the next call without restarting anything.

    `temp` (the folder the API's own example curl uses) reads as scratch
    space that may be purged — fine for the probe this module's tests ran
    against, wrong for art a printed book depends on staying put. Real
    content should set `AV_UPLOAD_FOLDER` to something permanent; this
    default only covers the case nobody has decided that yet.
    """
    folder = os.environ.get("AV_UPLOAD_FOLDER", "book-figures")
    return ("%s?uploadType=general&folderPath=%s&targetDpi=300"
           % (UPLOAD_HOST, urllib.parse.quote(folder, safe="")))

# One request every image reference goes through at most once, ever — the
# cache keys on the CONTENT hash, not the path or URL, so the same picture
# reached two different ways (a local file today, the identical bytes at a
# mathpix URL tomorrow) uploads only the first time, and a build that runs
# twice against unchanged art makes zero network calls the second time.
_CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".cache", "uploaded_images.json")

_DATA_URI_RE = re.compile(r'^data:([^;,]+)?(;base64)?,(.*)$', re.S)

_TIMEOUT = 30


def _load_cache():
    try:
        return json.load(io.open(_CACHE_PATH, encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache):
    os.makedirs(os.path.dirname(_CACHE_PATH), exist_ok=True)
    tmp = _CACHE_PATH + ".tmp"
    io.open(tmp, "w", encoding="utf-8").write(
        json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True))
    os.replace(tmp, _CACHE_PATH)


_ENV_LOADED = [False]
_DOTENV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env")


def _load_dotenv():
    """`.env` at the repo root, read once per process.

    An EXPLICIT `export` always wins — this only fills in a variable that
    is not already set, which is the usual dotenv contract and means a
    CI job or a shell export can still override the file without editing
    it. Malformed lines are skipped rather than raising: a build must not
    fail because someone's `.env` has a stray blank line or a comment
    shaped oddly.
    """
    if _ENV_LOADED[0]:
        return
    _ENV_LOADED[0] = True
    try:
        lines = io.open(_DOTENV_PATH, encoding="utf-8").read().splitlines()
    except OSError:
        return
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def credentials_configured():
    _load_dotenv()
    return bool(os.environ.get("AV_UPLOAD_USER_ID")
                and os.environ.get("AV_UPLOAD_TOKEN"))


def _content_hash(data):
    return hashlib.sha256(data).hexdigest()


def _download(url):
    """An external link's bytes, or None. Never raises — a network hiccup
    or a dead mathpix crop must not fail the build; it just leaves the
    original link in place, same as before this module existed."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "vidyut-build/1.0"})
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            return resp.read()
    except Exception:
        return None


def _extract_url(payload):
    """The response's `data.results[0].cdnUrl` — VERIFIED against a live call.

    A real upload was made and checked against both URLs the endpoint
    returns:

        data.results[0].s3Url   -> HTTP 403, the bucket is not public
        data.results[0].cdnUrl  -> HTTP 200, correct bytes, correct type

    `cdnUrl` (CloudFront) is the only field that is actually a working
    image URL for a reader's browser. Returning `s3Url` instead would not
    fail loudly — it would silently put a broken image in the printed
    book, which is worse than every other failure path in this module,
    all of which fall back to something that already worked. So `cdnUrl`
    is the ONLY field trusted here; a response missing it is treated as a
    failed upload (returns None), not papered over with a URL that 403s.

    The generic walk is kept as a narrow fallback for a response shaped
    slightly differently than the one seen (a single result not wrapped
    in a list, for instance) — never as a way to accept `s3Url`.
    """
    try:
        results = payload["data"]["results"]
        if isinstance(results, list) and results:
            cdn = results[0].get("cdnUrl")
            if isinstance(cdn, str) and cdn.startswith(("http://", "https://")):
                return cdn
    except (KeyError, TypeError, IndexError, AttributeError):
        pass

    def dig(obj):
        if isinstance(obj, dict):
            if isinstance(obj.get("cdnUrl"), str):
                return obj["cdnUrl"]
            for v in obj.values():
                found = dig(v)
                if found:
                    return found
        if isinstance(obj, list) and obj:
            return dig(obj[0])
        return None
    return dig(payload)


def _upload_bytes(data, filename):
    """POST raw bytes to the upload endpoint; return the hosted URL or None.

    Cached on the content hash — see the module docstring. Every failure
    (no credentials, no network, a non-2xx response, a response shape
    `_extract_url` cannot parse) returns None rather than raising, because
    every caller's contract is "give me a URL or I'll keep what I had."
    """
    if not credentials_configured():
        return None

    key = _content_hash(data)
    cache = _load_cache()
    if key in cache:
        return cache[key]

    user_id = os.environ["AV_UPLOAD_USER_ID"]
    token = os.environ["AV_UPLOAD_TOKEN"]
    ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    boundary = "----vidyutupload%s" % key[:24]

    body = io.BytesIO()
    body.write(("--%s\r\n" % boundary).encode())
    body.write(('Content-Disposition: form-data; name="files"; filename="%s"\r\n'
               % filename).encode())
    body.write(("Content-Type: %s\r\n\r\n" % ctype).encode())
    body.write(data)
    body.write(("\r\n--%s--\r\n" % boundary).encode())

    req = urllib.request.Request(_upload_url(), data=body.getvalue(), method="POST")
    req.add_header("accept", "*/*")
    req.add_header("userId", user_id)
    req.add_header("token", token)
    req.add_header("Content-Type", "multipart/form-data; boundary=%s" % boundary)

    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, ValueError, TimeoutError, OSError):
        return None

    url = _extract_url(payload)
    if not url:
        return None
    cache[key] = url
    _save_cache(cache)
    return url


def resolve_ref(ref, base_dir=None):
    """The one entry point: any `ref` shape in, a browser-fetchable URL out.

    Tries, in order — the first shape `ref` actually matches wins:
      1. empty                 -> unchanged (no image; today's placeholder)
      2. `data:` URI            -> decoded and uploaded
      3. `http(s)://`           -> downloaded and re-uploaded (mirrors an
                                   external link like a mathpix crop into
                                   this platform's own storage)
      4. an existing local file -> uploaded directly
      5. anything else          -> unchanged (still just a path with
                                   nothing behind it — the same placeholder
                                   this chapter drew before art existed)

    `base_dir` is where a relative local path is resolved from when it is
    not found as-is (relative to the current working directory) — pass the
    source `.md` file's own directory when calling this from the reader
    side; the pipeline's render step, which has no such directory, omits it
    and only resolves paths already relative to the working directory.
    """
    ref = (ref or "").strip()
    if not ref:
        return ref

    m = _DATA_URI_RE.match(ref)
    if m:
        try:
            import base64
            data = base64.b64decode(m.group(3))
        except Exception:
            return ref
        url = _upload_bytes(data, "image.png")
        return url or ref

    if ref.startswith(("http://", "https://")):
        data = _download(ref)
        if data is None:
            return ref
        url = _upload_bytes(data, os.path.basename(ref.split("?")[0]) or "image")
        return url or ref

    candidates = [ref]
    if base_dir:
        candidates.append(os.path.join(base_dir, ref))
    for path in candidates:
        if os.path.isfile(path):
            with open(path, "rb") as f:
                data = f.read()
            url = _upload_bytes(data, os.path.basename(path))
            return url or ref

    return ref
