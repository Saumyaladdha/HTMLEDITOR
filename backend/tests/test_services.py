"""Unit tests for the pure service functions.

These deliberately avoid the database and S3 — they cover the logic that
silently produced wrong output for real inputs (Hindi titles, page counting,
editor scaffolding leaking into saved HTML), which is exactly the class of
bug that ships unnoticed because nothing crashes.
"""
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.routers.export import _content_disposition
from app.services.html_sanitize import strip_editor_chrome
from app.services.html_validate import count_pages, looks_paginated, validate_saved_html, validate_upload


# --------------------------------------------------------------------------
# Content-Disposition — every real title in this pipeline is Hindi, and HTTP
# header values are latin-1 only. Interpolating the title directly raised
# UnicodeEncodeError, so HTML export was broken for the entire real corpus.
# --------------------------------------------------------------------------

@pytest.mark.parametrize(
    "title",
    [
        "अध्याय 1 — विद्युत आवेश एवं क्षेत्र",
        "Chapter 3: Fields/Waves",
        'Evil"; X-Injected: 1',
        "  ",
        "café",
    ],
)
def test_content_disposition_is_latin1_encodable(title):
    header = _content_disposition(title, ".html")
    header.encode("latin-1")  # must not raise — this is the actual bug


def test_content_disposition_neutralises_header_injection():
    header = _content_disposition('x"; X-Evil: 1\r\nX-Another: 2', ".html")
    ascii_part = header.split("filename*=")[0]
    assert "\r" not in header and "\n" not in header
    # Exactly one quoted filename value, so nothing escaped the quoted string.
    assert ascii_part.count('"') == 2


def test_content_disposition_preserves_unicode_title_in_filename_star():
    header = _content_disposition("अध्याय", ".html")
    assert "filename*=UTF-8''" in header
    assert "%E0%A4" in header  # percent-encoded Devanagari


def test_content_disposition_always_has_a_usable_ascii_fallback():
    header = _content_disposition("अध्याय", ".html")
    assert 'filename="' in header
    ascii_name = header.split('filename="')[1].split('"')[0]
    assert ascii_name.endswith(".html") and len(ascii_name) > len(".html")


# --------------------------------------------------------------------------
# Page counting — `\bpage\b` also matched class="page-number" (hyphen is a
# word boundary), inflating the count shown in version history.
# --------------------------------------------------------------------------

def test_count_pages_counts_only_exact_page_class():
    html = """
      <div class="page"><div class="page__cols"></div></div>
      <div class="page"><div class="page__cols"></div></div>
      <span class="page-number">7</span>
      <span class="page-footer"></span>
      <div class="pageant"></div>
    """
    assert count_pages(html) == 2


def test_count_pages_handles_multi_class_attributes():
    assert count_pages('<div class="page page--first">x</div>') == 1


def test_flow_document_reports_zero_pages_not_an_error():
    assert count_pages("<article><p>Hello</p></article>") == 0
    assert looks_paginated("<article><p>Hello</p></article>") is False


# --------------------------------------------------------------------------
# Upload validation — used to REQUIRE this pipeline's own .page/.page__cols
# divs, making every other HTML document impossible to upload at all.
# --------------------------------------------------------------------------

def test_upload_accepts_ordinary_html():
    html = b"<!doctype html><html><body><article><p>Just a document.</p></article></body></html>"
    assert validate_upload(html)


def test_upload_accepts_paginated_chapter():
    html = b'<html><body><div class="page"><div class="page__cols"><p>x</p></div></div></body></html>'
    assert validate_upload(html)


def test_upload_rejects_empty_and_non_markup():
    with pytest.raises(HTTPException) as e:
        validate_upload(b"")
    assert e.value.status_code == 400

    with pytest.raises(HTTPException):
        validate_upload(b"just some plain text, no markup at all")


def test_upload_accepts_non_utf8_html():
    # Deliberately inverted from the old behaviour: this used to raise
    # "File is not valid UTF-8 HTML". Real HTML is frequently windows-1252,
    # and rejecting it made those documents impossible to open at all.
    raw = "<html><body><p>caf\u00e9 na\u00efve</p></body></html>".encode("windows-1252")
    assert validate_upload(raw)


def test_saved_html_rejects_empty():
    with pytest.raises(HTTPException):
        validate_saved_html("   \n  ")


# --------------------------------------------------------------------------
# Editor chrome — saving serialized the live DOM verbatim, so a finished
# chapter could ship with a red overflow border and draggable="true" on
# every block baked into the exported file.
# --------------------------------------------------------------------------

def test_strip_editor_chrome_removes_scaffolding():
    html = (
        '<div class="page" data-page-id="page-1">'
        '<p class="text-body" data-block-id="b-3" draggable="true" contenteditable="true">Hi</p>'
        '<img data-broken-flagged="1" src="x.png">'
        '<div id="__drop_indicator__"></div>'
        "</div>"
    )
    out = strip_editor_chrome(html)
    for leftover in [
        "data-block-id",
        "data-page-id",
        "data-broken-flagged",
        "draggable=",
        "contenteditable=",
        "__drop_indicator__",
    ]:
        assert leftover not in out, f"{leftover} survived sanitisation"


def test_strip_editor_chrome_preserves_real_content():
    html = '<p class="text-body" style="--fs-base: 20px">विद्युत आवेश</p>'
    out = strip_editor_chrome(html)
    assert 'class="text-body"' in out
    assert "--fs-base: 20px" in out
    assert "विद्युत आवेश" in out


def test_strip_editor_chrome_is_idempotent():
    html = '<p data-block-id="b-1" draggable="true">x</p>'
    once = strip_editor_chrome(html)
    assert strip_editor_chrome(once) == once


# --------------------------------------------------------------------------
# Ingest: encoding detection and script-rendered document recognition.
# --------------------------------------------------------------------------

from app.services.html_ingest import decode_html, is_script_rendered, visible_text_length


def test_decode_utf8():
    text, enc = decode_html("<html><body><p>विद्युत आवेश</p></body></html>".encode("utf-8"))
    assert "विद्युत" in text
    assert enc == "utf-8"


def test_decode_windows_1252_is_accepted_not_rejected():
    # Previously any non-UTF-8 upload was rejected outright as "not valid
    # UTF-8 HTML", which fails a large share of real-world HTML.
    raw = '<html><body><p>café naïve — dash</p></body></html>'.encode("windows-1252")
    text, enc = decode_html(raw)
    assert "caf" in text
    assert enc in {"windows-1252", "latin-1"}


def test_decode_honours_declared_charset():
    raw = '<html><head><meta charset="windows-1252"></head><body><p>café</p></body></html>'.encode("windows-1252")
    text, enc = decode_html(raw)
    assert enc == "windows-1252"
    assert "café" in text


def test_decode_handles_utf8_bom():
    raw = b"\xef\xbb\xbf<html><body><p>hi</p></body></html>"
    text, enc = decode_html(raw)
    assert enc == "utf-8-sig"
    assert text.startswith("<html>")


def test_decode_never_raises_on_arbitrary_bytes():
    text, _ = decode_html(bytes(range(256)))
    assert isinstance(text, str)


def test_visible_text_ignores_script_and_style_bodies():
    html = "<style>" + "a{color:red}" * 500 + "</style><script>" + "x" * 5000 + "</script><p>Only this</p>"
    assert visible_text_length(html) < 40


def test_script_rendered_detection():
    bundle = (
        '<html><body><div>This page requires JavaScript to display.</div>'
        '<script type="__bundler/manifest">' + "A" * 100000 + "</script></body></html>"
    )
    assert is_script_rendered(bundle) is True


def test_ordinary_document_is_not_script_rendered():
    html = "<html><body><article><h1>T</h1><p>" + ("word " * 400) + "</p></article></body></html>"
    assert is_script_rendered(html) is False


def test_document_with_analytics_script_is_not_misclassified():
    # A real page carrying a large third-party script must not be mistaken
    # for a bundle — it has plenty of readable content of its own.
    html = (
        "<html><body><p>" + ("word " * 500) + "</p><script>" + "x" * 80000 + "</script></body></html>"
    )
    assert is_script_rendered(html) is False
