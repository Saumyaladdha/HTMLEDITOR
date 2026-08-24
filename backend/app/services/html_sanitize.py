import re

# --------------------------------------------------------------------------
# Editor-chrome stripping — server-side BACKSTOP.
#
# The editor mutates the live iframe DOM to do its job: it stamps
# data-block-id on every block, sets draggable="true" + cursor:grab so blocks
# can be dragged, paints a red outline on overflowing pages, and a dashed one
# on multi-selected blocks. Saving serialized `documentElement.outerHTML`
# verbatim, so all of that was being written into the stored version AND into
# every exported chapter — a finished PDF could ship with a red overflow
# border baked into the page.
#
# The authoritative fix runs client-side (frontend/src/editor/sanitize.ts),
# where a real DOM is available and inline styles can be cleaned property by
# property. This module exists so the guarantee doesn't depend on the client
# behaving: any writer to POST /versions gets the unambiguous attribute cases
# stripped regardless.
#
# Scope is deliberately narrow. Every pattern here targets an attribute the
# EDITOR ITSELF writes and that carries no meaning in source content, so
# removing it can't damage a legitimate document. Inline-style cleanup
# (cursor/outline/opacity) needs real CSS parsing to do safely and is left to
# the client sanitizer rather than attempted with regexes here.
# --------------------------------------------------------------------------

_STRIP_ATTRS = [
    re.compile(r'\s+data-block-id="[^"]*"'),
    re.compile(r'\s+data-page-id="[^"]*"'),
    re.compile(r'\s+data-broken-flagged="[^"]*"'),
    re.compile(r'\s+draggable="(?:true|false)"'),
    re.compile(r'\s+contenteditable="(?:true|false|plaintext-only)"'),
]

# The drag-and-drop insertion indicators are real elements injected into the
# document while a drag is in flight. They're removed on drop/dragend, but a
# save landing mid-gesture (autosave fires on a timer) could capture one.
_STRIP_ELEMENTS = re.compile(
    r'<div[^>]*id="__(?:nested_)?drop_indicator__"[^>]*>\s*</div>',
    re.IGNORECASE,
)


def strip_editor_chrome(html: str) -> str:
    for pattern in _STRIP_ATTRS:
        html = pattern.sub("", html)
    return _STRIP_ELEMENTS.sub("", html)
