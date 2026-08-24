import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Book,
  BookVersion,
  exportUrl,
  getBook,
  getVersionHtml,
  listVersions,
  revertToVersion,
  saveVersion,
} from "../api/books";
import {
  applyImageToFigureSlot,
  findBlockAncestor,
  findFigureImageSlot,
  findInlineSpan,
  findSubPart,
  isEmptyImageSlot,
  stampBlockIds,
} from "../editor/selection";
import { applyFigureWidth, isImageSubPart, registryEntryFor } from "../editor/propertyRegistry";
import {
  clearSelectionFormatting,
  setContentEditable,
  stepSelectionFontSize,
  toggleInlineTag,
  wrapSelection,
} from "../editor/textEditing";
import { fileToDataUrl } from "../editor/imageSwap";
import {
  makeBlocksDraggable,
  attachDragReorder,
  makeNestedItemsDraggable,
  attachNestedItemReorder,
} from "../editor/dragDrop";
import { BookDocument, parseDocument, serializeDocument, renderSinglePageHtml } from "../editor/model";
import { ScreenRect, isPageOverflowing, toOuterRect } from "../editor/geometry";
import { PageEntry } from "../components/PageThumbnailRail/PageThumbnailRail";
import PropertyPanel from "../components/PropertyPanel/PropertyPanel";
import PageThumbnailRail from "../components/PageThumbnailRail/PageThumbnailRail";
import VersionHistoryPanel from "../components/VersionHistoryPanel/VersionHistoryPanel";
import InsertBlockPalette from "../components/InsertBlockPalette/InsertBlockPalette";
import FloatingTextToolbar from "../components/FloatingTextToolbar/FloatingTextToolbar";
import FloatingBlockToolbar from "../components/FloatingBlockToolbar/FloatingBlockToolbar";
import EditHtmlModal from "../components/EditHtmlModal/EditHtmlModal";
import ImageResizeHandles from "../components/ImageResizeHandles/ImageResizeHandles";
import TocPanel from "../components/TocPanel/TocPanel";
import { buildToc, TocEntry } from "../editor/toc";
import FindReplacePanel from "../components/FindReplacePanel/FindReplacePanel";
import { findMatches, highlightMatch, replaceAll as replaceAllMatches, replaceMatch, Match } from "../editor/findReplace";

export default function BookEditor() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [versions, setVersions] = useState<BookVersion[]>([]);
  const [html, setHtml] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsert, setShowInsert] = useState(false);
  const [tocEntries, setTocEntries] = useState<TocEntry[] | null>(null);

  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  // Live DOM Text-node references, not React state — re-rendering on every
  // keystroke of the search box is fine, but the match LIST itself doesn't
  // need to trigger a render on its own, and DOM node references aren't
  // meaningful values for React to diff anyway.
  const matchesRef = useRef<Match[]>([]);
  const [pageFontSizePx, setPageFontSizePx] = useState(20);
  // Visible confirmation that autosave actually ran — otherwise it's a
  // silent background timer with no way to tell it's working short of
  // checking Version History (or the database) after the fact.
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<HTMLElement | null>(null);
  const [selectedSubPart, setSelectedSubPart] = useState<HTMLElement | null>(null);
  // The actual entity being edited when it differs from `selectedBlock` —
  // e.g. a `.figure-grid` groups two independent <figure>s under ONE
  // data-block-id (stampBlockIds only marks direct .page__cols children,
  // and the grid, not either figure, is that direct child). selectedBlock
  // stays the real draggable/deletable/movable unit for the toolbar;
  // selectedSubBlock is whichever inner <figure> a click actually landed
  // in, and drives the property panel / resize handles instead so editing
  // one figure's width/image never touches its sibling.
  const [selectedSubBlock, setSelectedSubBlock] = useState<HTMLElement | null>(null);

  // Multi-select (shift-click) — a Set of block ids in addition to the
  // single `selectedBlock` above, which stays the "last clicked" block and
  // drives the property panel / single-block toolbar. Once more than one
  // id is selected, the UI switches to the bulk toolbar instead.
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());

  // A cheap re-render trigger so floating toolbar/handle positions (always
  // computed fresh from live getBoundingClientRect() at render time, never
  // cached in state) stay in sync with scrolling and selection changes —
  // see the `tick()` calls sprinkled through the DOM listeners below.
  const [, bumpTick] = useState(0);
  const tick = useCallback(() => bumpTick((n) => n + 1), []);
  const scrollTickRaf = useRef<number | null>(null);
  function tickOnScroll() {
    if (scrollTickRaf.current !== null) return;
    scrollTickRaf.current = requestAnimationFrame(() => {
      scrollTickRaf.current = null;
      tick();
    });
  }

  const [editHtmlTarget, setEditHtmlTarget] = useState<HTMLElement | null>(null);
  const [overflowPageIndices, setOverflowPageIndices] = useState<Set<number>>(new Set());
  const dirtyRef = useRef(false);
  const bookRef = useRef<Book | null>(null);
  const multiSelectedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    multiSelectedIdsRef.current = multiSelectedIds;
    const doc = getDoc();
    if (!doc) return;
    doc.querySelectorAll<HTMLElement>("[data-block-id]").forEach((el) => {
      const id = el.dataset.blockId ?? "";
      el.style.outline = multiSelectedIds.has(id) ? "2px dashed var(--accent, #6c8bff)" : "";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiSelectedIds, html]);

  // The model everything renders from (see model.ts / the approved plan).
  // Editing gestures still mutate the live iframe DOM directly for instant
  // feedback (a full re-render per keystroke would fight the caret) — each
  // commitToModel() call re-absorbs that live DOM into a fresh snapshot,
  // which is what undo/redo actually rewinds/replays.
  const [docModel, setDocModel] = useState<BookDocument | null>(null);
  const docModelRef = useRef<BookDocument | null>(null);
  const historyRef = useRef<BookDocument[]>([]);
  const futureRef = useRef<BookDocument[]>([]);
  const MAX_HISTORY = 50;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activePage, setActivePage] = useState(1);

  // The real page size (A4 @ 150dpi, per elements/page/page.css's --pg-w/
  // --pg-h) is 1240x1754 — a fixed iframe width of 900 clipped roughly a
  // third of every page off the right edge, which is exactly the "only
  // this much is visible, very messy to edit" problem. Instead, size the
  // iframe to the REAL content dimensions and scale the whole thing down
  // to fit the available canvas width, so the full page is always
  // visible with no horizontal clipping or scrolling.
  const PAGE_W = 1240;
  const mainRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasScaleRef = useRef(1);
  useEffect(() => {
    canvasScaleRef.current = canvasScale;
  }, [canvasScale]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);
  const [contentHeight, setContentHeight] = useState(PAGE_W * (1754 / 1240));

  // One standalone single-page HTML string per page, for the thumbnail
  // rail — each thumbnail lazily renders its own copy in a mini-iframe
  // (see PageThumbnailRail). Recomputed only when the model actually
  // changes, not on every render.
  const pages: PageEntry[] = useMemo(() => {
    if (!docModel) return [];
    return docModel.pages.map((p, i) => ({ id: p.id, html: renderSinglePageHtml(docModel, i) }));
  }, [docModel]);

  async function load(versionIdOverride?: string) {
    if (!bookId) return;
    try {
      const b = await getBook(bookId);
      const vs = await listVersions(bookId);
      setBook(b);
      setVersions(vs);
      const targetVersionId = versionIdOverride ?? b.current_version_id;
      if (targetVersionId) {
        const h = await getVersionHtml(bookId, targetVersionId);
        // Sanity-check BEFORE writing it into the iframe — a saved version
        // that somehow ended up structurally empty (no real .page content)
        // despite non-trivial size would otherwise render as a blank
        // canvas with no explanation. Mirrors the same guard undo/redo
        // already has (isSnapshotSane) — same failure mode, different
        // entry point (loading, not restoring).
        const parsed = parseDocument(h);
        const totalBlocks = parsed.pages.reduce((n, p) => n + p.blocks.length + p.fullBlocks.length, 0);
        if (h.length > 1000 && totalBlocks === 0) {
          setError(
            "This saved version looks corrupted (no page content found) — try reverting to an earlier version from History.",
          );
          return;
        }
        setHtml(h);
        // Fresh baseline — loading a version resets undo history rather
        // than trying to splice it onto a differently-shaped document.
        historyRef.current = [];
        futureRef.current = [];
        setCanUndo(false);
        setCanRedo(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load book");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Without this, reloading or closing the tab while dirty (up to ~20s of
  // edits not yet autosaved, or longer if autosave itself is failing)
  // loses that work with zero warning. Reads dirtyRef (stable identity),
  // not `dirty` state, so this only needs to be registered once.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = ""; // required for Chrome to show the native prompt
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Autosave: every 20s, if there are unsaved changes, silently persist a
  // version labeled "Autosave" — reads dirty/book off refs (not state)
  // since this closure is only ever set up once per bookId, so it would
  // otherwise always see the values from that first render. 20s (rather
  // than a longer production-typical interval) makes it verifiable in a
  // single short test instead of requiring a minute of uninterrupted
  // waiting; dial back up once confirmed working end-to-end.
  useEffect(() => {
    if (!bookId) return;
    const id = window.setInterval(async () => {
      if (!dirtyRef.current) return;
      const doc = getDoc();
      if (!doc) return;
      try {
        const serialized = "<!doctype html>\n" + doc.documentElement.outerHTML;
        const version = await saveVersion(bookId, serialized, "Autosave", bookRef.current?.current_version_id ?? undefined);
        setDirty(false);
        setBook((b) => (b ? { ...b, current_version_id: version.id } : b));
        setVersions((vs) => [version, ...vs]);
        setLastAutosavedAt(new Date());
      } catch {
        // Silent — dirty stays true (we returned before clearing it) so
        // the next tick, or a manual Save, just retries.
      }
    }, 20000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const getDoc = useCallback(() => iframeRef.current?.contentDocument ?? null, []);

  // Recomputes the fit-to-width scale whenever the canvas area resizes
  // (window resize, side panels toggling) — the real page is a fixed
  // 1240px wide, so it must always be scaled down to whatever room is
  // actually available, never shown at native size with the rest clipped.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const CANVAS_PADDING = 48; // leaves a little breathing room on each side
    const compute = () => {
      const available = el.clientWidth - CANVAS_PADDING;
      setCanvasScale(Math.min(1, available / PAGE_W));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deliberately NOT using the iframe's `srcdoc` attribute: some browsers
  // silently truncate very large srcdoc strings, and a packaged chapter's
  // inlined CSS/font <style> block alone can be several MB — a truncated
  // stylesheet cuts off partway through, applying only the earliest rules
  // and leaving everything after (columns, section-head, def-item colors)
  // completely unstyled, with no error anywhere. Writing directly into the
  // iframe's own document via document.open/write/close has no such limit.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || html === null) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    const model = parseDocument(html);
    setDocModel(model);
    docModelRef.current = model;
    onIframeLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  /** Re-absorbs the live iframe DOM into a fresh model snapshot, pushing
   * the previous snapshot onto the undo stack. Called after every discrete
   * editing action (text-edit commit, color/size change, image swap,
   * block add/remove/move) — never per-keystroke, so typing doesn't fight
   * a re-render. This is the ONLY place history is pushed, so every commit
   * path (existing and future) gets undo/redo for free by calling it. */
  function commitToModel() {
    const doc = getDoc();
    if (!doc) return;
    const currentHtml = "<!doctype html>\n" + doc.documentElement.outerHTML;
    const newModel = parseDocument(currentHtml);
    if (docModelRef.current) {
      historyRef.current.push(docModelRef.current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    }
    futureRef.current = [];
    docModelRef.current = newModel;
    setDocModel(newModel);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(false);
  }

  function restoreSnapshot(snapshot: BookDocument) {
    docModelRef.current = snapshot;
    setDocModel(snapshot);
    setHtml(serializeDocument(snapshot)); // triggers the [html] effect -> full re-render
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    // NOT markDirty()/commitToModel() here: commitToModel reads the LIVE
    // iframe DOM, but setHtml above only takes effect later via the
    // [html] effect's doc.write() — at this exact point the DOM is still
    // showing the PRE-restore content. Calling commitToModel synchronously
    // here re-parsed that stale DOM as if it were a fresh edit, corrupting
    // docModelRef with the wrong snapshot, wiping the redo stack
    // (futureRef.current = []) on every single undo, and pushing a bogus
    // duplicate onto history — repeated undo/redo on top of that
    // corruption could plausibly end up rendering an empty/broken page.
    // The [html] effect's own onIframeLoad() already re-checks overflow
    // once the real DOM is in place, so nothing here needs to trigger it.
    setDirty(true);
  }

  /** A snapshot that's structurally empty (no pages, or every page with
   * zero blocks at all) is never legitimate for a real chapter — refusing
   * it here is a last-resort backstop against corrupted history (e.g. a
   * bad snapshot pushed by a now-fixed bug, still sitting in memory from
   * before this session's code was updated — Fast Refresh preserves
   * useRef state across edits, it doesn't reset it) ever being APPLIED
   * and rendering a blank page. Refusing it also surfaces the problem via
   * a visible error instead of silently doing nothing OR silently
   * blanking the page, either of which is worse than telling the user
   * their undo/redo history got wedged.
   */
  function isSnapshotSane(snapshot: BookDocument): boolean {
    if (snapshot.pages.length === 0) return false;
    const totalBlocks = snapshot.pages.reduce((n, p) => n + p.blocks.length + p.fullBlocks.length, 0);
    return totalBlocks > 0;
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    if (!isSnapshotSane(prev)) {
      setError("Undo history looks corrupted — please reload the book to reset it.");
      return;
    }
    if (docModelRef.current) futureRef.current.push(docModelRef.current);
    restoreSnapshot(prev);
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    if (!isSnapshotSane(next)) {
      setError("Redo history looks corrupted — please reload the book to reset it.");
      return;
    }
    if (docModelRef.current) historyRef.current.push(docModelRef.current);
    restoreSnapshot(next);
  }

  // Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z from anywhere, including while focus is
  // inside the iframe (a second listener there, attached in onIframeLoad,
  // covers that — see below).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onIframeLoad() {
    const doc = getDoc();
    if (!doc) return;
    stampBlockIds(doc);
    // Nested-item (single figure in a pair, single bullet line) drag must
    // attach BEFORE the block-level drag below — see attachNestedItemReorder's
    // own doc comment for why registration order here isn't arbitrary.
    makeNestedItemsDraggable(doc);
    attachNestedItemReorder(doc, markDirty);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
    attachDragReorder(doc, markDirty);

    // Some pipeline output references decorator/illustration images by a
    // relative file path (e.g. section-head's "student with pencil"
    // artwork) rather than an embedded data URI — that path never
    // resolves once the file is opened standalone in this editor, so the
    // image silently fails to load while its reserved layout space stays,
    // showing as inexplicable blank space with no indication anything is
    // wrong. `error` on <img> doesn't bubble, so this has to listen on
    // the capture phase to catch it at all.
    doc.addEventListener(
      "error",
      (e) => {
        const img = e.target as HTMLImageElement;
        if (!img || img.tagName !== "IMG" || img.dataset.brokenFlagged) return;
        img.dataset.brokenFlagged = "1";
        // Styled to match the pipeline's OWN "चित्र यहाँ आएगा" placeholder
        // look (dashed tan box) rather than an alarming red error box —
        // this is a normal, expected placeholder state (a relative-path
        // decorator image that can't resolve standalone), not a fault.
        img.alt = "चित्र यहाँ आएगा — क्लिक करके जोड़ें";
        img.style.display = "inline-flex";
        img.style.alignItems = "center";
        img.style.justifyContent = "center";
        img.style.minHeight = "48px";
        img.style.minWidth = "48px";
        img.style.border = "2px dashed #9a8f7d";
        img.style.borderRadius = "8px";
        img.style.background = "#faf8f4";
        img.style.color = "#9a8f7d";
        img.style.fontSize = "11px";
        img.style.cursor = "pointer";
        img.title = "Image not available — click to upload one";
      },
      true,
    );

    const pageEls = Array.from(doc.querySelectorAll<HTMLElement>(".page"));

    // Real content height (all pages stacked), so the scaled wrapper
    // reserves exactly enough scroll space — not the iframe's own
    // possibly-clipped box size.
    setContentHeight(doc.body.scrollHeight || PAGE_W * (1754 / 1240));

    // The iframe itself no longer scrolls internally (it's sized to its
    // full native content height and shrunk visually via CSS transform)
    // — the OUTER <main> is the real scrolling element now, so active-page
    // tracking listens there instead of using an iframe-internal observer.
    const mainEl = mainRef.current;
    if (mainEl) {
      const onScroll = () => {
        const scaledTops = pageEls.map((el) => el.offsetTop * canvasScaleRef.current);
        const target = mainEl.scrollTop + mainEl.clientHeight * 0.3;
        let bestIdx = 0;
        for (let i = 0; i < scaledTops.length; i++) {
          if (scaledTops[i] <= target) bestIdx = i;
        }
        setActivePage(bestIdx + 1);
        // Floating toolbars/handles/overflow badges are positioned fresh
        // from getBoundingClientRect() at every render (never cached in
        // state) — scrolling moves them on screen without changing any of
        // that state, so this is what keeps them tracking the canvas.
        tickOnScroll();
      };
      mainEl.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    checkOverflow();

    const firstPage = doc.querySelector<HTMLElement>(".page");
    if (firstPage) {
      const fs = parseFloat(firstPage.style.getPropertyValue("--fs-base"));
      setPageFontSizePx(fs || 20);
    }

    doc.addEventListener("click", (e) => {
      const target = e.target as Element;

      // A flagged broken image (see the capture-phase 'error' listener
      // above) is fixable from anywhere, even decorator art that isn't
      // part of any registered figure sub-part — click it to replace it,
      // full stop, regardless of what block it happens to live inside.
      if (target.tagName === "IMG" && (target as HTMLElement).dataset.brokenFlagged) {
        e.stopPropagation();
        openImagePickerFor(target as HTMLElement);
        return;
      }

      const block = findBlockAncestor(target);

      // Deselecting (clicked outside any block) or switching to a
      // different block both end the previous block's direct-editing
      // session — otherwise two blocks could stay contentEditable at
      // once, and a stale edit could keep accepting keystrokes after
      // the user has visibly moved on.
      const prev = selectedBlockRef.current;
      if (prev && prev !== block && prev.isContentEditable) {
        setContentEditable(prev, false);
        commitToModel(); // capture the finished text edit before moving on
      }

      // Shift-click toggles multi-select membership instead of the normal
      // single-block/sub-part flow — a first shift-click seeds the set
      // with whatever was already singly-selected, so it reads as
      // "extend the selection" rather than starting from nothing.
      if (e.shiftKey && block) {
        const id = block.dataset.blockId;
        if (id) {
          setMultiSelectedIds((prevSet) => {
            const next = new Set(prevSet);
            if (next.has(id)) {
              next.delete(id);
            } else {
              const prevSingleId = selectedBlockRef.current?.dataset.blockId;
              if (prevSingleId && prevSingleId !== id) next.add(prevSingleId);
              next.add(id);
            }
            return next;
          });
        }
        setSelectedBlock(block);
        setSelectedSubPart(null);
        setSelectedSubBlock(null);
        return;
      }
      if (multiSelectedIdsRef.current.size > 0) setMultiSelectedIds(new Set());

      if (!block) {
        setSelectedBlock(null);
        setSelectedSubPart(null);
        setSelectedSubBlock(null);
        return;
      }

      // A block can be a composite wrapper around several independent
      // figures (`.figure-grid`) — when the click landed inside one of
      // its nested <figure>s, that figure (not the wrapper) is the real
      // "entity" for width/image/caption editing purposes, even though
      // `block` stays what the toolbar drags/duplicates/deletes.
      const nestedFigure = target.closest<HTMLElement>(".figure");
      const editEntity = nestedFigure && nestedFigure !== block && block.contains(nestedFigure) ? nestedFigure : block;

      const { entry } = registryEntryFor(editEntity);
      const hasImageSubPart = Object.values(entry.subParts ?? {}).some((d) => d.editable === "image");
      // findFigureImageSlot resolves the image/placeholder structurally
      // (first non-caption child), since real pipeline output often has no
      // `.figure__img` class at all — see its own doc comment. A click
      // landing on a still-empty slot jumps straight to the OS file
      // picker instead of just selecting the block, matching how a
      // directText block starts editing immediately below.
      const imageSlot = hasImageSubPart ? findFigureImageSlot(editEntity) : null;
      if (imageSlot && imageSlot.contains(target) && isEmptyImageSlot(imageSlot)) {
        setSelectedBlock(block);
        setSelectedSubBlock(editEntity !== block ? editEntity : null);
        setSelectedSubPart(imageSlot);
        openImagePickerFor(imageSlot);
        return;
      }

      if (block === selectedBlockRef.current) {
        const subPartClasses = ["text-color", "highlight", ...Object.keys(entry.subParts ?? {})];
        let sub = findInlineSpan(target, editEntity) ?? findSubPart(target, editEntity, subPartClasses);
        // Same structural fallback for an already-FILLED slot with no
        // class — class-based findSubPart alone would never match it, so
        // resize handles / replace-image controls would stay unreachable
        // forever after the first upload.
        if (!sub && imageSlot && imageSlot.contains(target)) sub = imageSlot;
        setSelectedSubPart(sub);
        setSelectedSubBlock(editEntity !== block ? editEntity : null);
      } else {
        setSelectedBlock(block);
        setSelectedSubPart(null);
        setSelectedSubBlock(editEntity !== block ? editEntity : null);
        // Click straight onto a plain-text block starts editing it
        // immediately — no need to select it, then separately hunt for
        // an "Edit text" button in the side panel first. Never for a
        // composite wrapper being entered via editEntity — that click
        // landed on a nested figure's own chrome, not loose text.
        if (entry.directText && editEntity === block) {
          setContentEditable(block, true);
          markDirty();
        }
      }
    });

    // Blur without a follow-up click inside the iframe (e.g. clicking the
    // property panel, or tabbing away) still needs to commit the finished
    // edit — the click-handler path above only fires on the NEXT click
    // landing inside this same document.
    doc.addEventListener("focusout", (e) => {
      const el = e.target as HTMLElement;
      if (el?.isContentEditable) {
        setContentEditable(el, false);
        commitToModel();
      }
    });

    // The floating text-selection toolbar reads doc.getSelection() fresh at
    // render time (see the render body) rather than caching a rect in
    // state — this listener's only job is to trigger a re-render so that
    // read happens again whenever the selection actually moves. Throttled
    // via the same rAF gate as scroll, since selectionchange fires on
    // every caret move while typing.
    doc.addEventListener("selectionchange", tickOnScroll);

    // Undo/redo while focus is inside the iframe (typing in a text block)
    // — keydown here does NOT bubble to the parent window, so this is a
    // separate listener from the one on `window`, not a duplicate.
    doc.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind(true);
      }
    });

    // Drag a photo straight onto a figure placeholder to fill it in —
    // no need to select the block first and hunt for the "Replace image"
    // button in the side panel. Delegated on the document so it works
    // for every figure on the page without per-element listeners.
    //
    // findFigureImageSlot resolves the actual image-or-placeholder element
    // STRUCTURALLY (first non-caption child of `.figure`), not by class —
    // real pipeline output often has no `.figure__img` class at all, just
    // an unclassed `<div style="border:2px dashed ...">` placeholder.
    // Falling back to `.closest('.figure')` here used to mean the whole
    // <figure> became the drop target, and `imgTarget.textContent = ""`
    // then deleted the <figcaption> along with the placeholder — never
    // target anything wider than the actual slot.
    const findImgTarget = (el: Element | null) => {
      const figure = el?.closest<HTMLElement>(".figure");
      return figure ? findFigureImageSlot(figure) : null;
    };
    doc.addEventListener("dragover", (e) => {
      if (!findImgTarget(e.target as Element)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });
    doc.addEventListener("dragenter", (e) => {
      const imgTarget = findImgTarget(e.target as Element);
      if (imgTarget) imgTarget.style.outline = "3px dashed var(--accent, #6c8bff)";
    });
    doc.addEventListener("dragleave", (e) => {
      const imgTarget = findImgTarget(e.target as Element);
      if (imgTarget) imgTarget.style.outline = "";
    });
    doc.addEventListener("drop", (e) => {
      const imgTarget = findImgTarget(e.target as Element);
      if (!imgTarget) return;
      e.preventDefault();
      imgTarget.style.outline = "";
      const file = e.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      fileToDataUrl(file).then((url) => {
        const placed = applyImageToFigureSlot(imgTarget, url);
        setSelectedSubPart(placed);
        markDirty();
      });
    });

  }

  /** Creates a throwaway file input inside the iframe's own document,
   * triggers it, and applies whatever image comes back to `slot` — shared
   * by the click-to-upload placeholder shortcut and (indirectly) the
   * property panel's "Replace image" button logic. */
  function openImagePickerFor(slot: HTMLElement) {
    const doc = getDoc();
    if (!doc) return;
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      const url = await fileToDataUrl(file);
      // applyImageToFigureSlot may REPLACE a raw placeholder <div> with a
      // fresh <img class="figure__img"> (see its own doc comment) — the
      // original `slot` node is then detached, so selection has to follow
      // whatever element the image actually ended up in, or resize
      // handles/property panel would target a node no longer on the page.
      const placed = applyImageToFigureSlot(slot, url);
      // Clear the "broken image" flagging/styling if this was fixing one
      // (see the capture-phase 'error' listener in onIframeLoad) — a
      // freshly-uploaded photo shouldn't keep the dashed red placeholder look.
      if (placed.dataset.brokenFlagged) {
        delete placed.dataset.brokenFlagged;
        placed.removeAttribute("title");
        placed.style.display = "";
        placed.style.alignItems = "";
        placed.style.justifyContent = "";
        placed.style.minHeight = "";
        placed.style.minWidth = "";
        placed.style.border = "";
        placed.style.background = "";
        placed.style.color = "";
        placed.style.fontSize = "";
        placed.style.cursor = "";
      }
      setSelectedSubPart(placed);
      markDirty();
    };
    doc.body.appendChild(input);
    input.click();
  }

  // A ref mirror of selectedBlock so the click handler (registered once per
  // iframe load) always sees the latest selection without re-attaching.
  const selectedBlockRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    selectedBlockRef.current = selectedBlock;
  }, [selectedBlock]);

  function markDirty() {
    setDirty(true);
    commitToModel();
    checkOverflow();
  }

  /** A page's fixed print box never grows to fit content — it clips or
   * spills silently — so every mutation re-checks each page's real
   * scrollHeight against its own (CSS-fixed) clientHeight and paints a red
   * outline directly on the live page element when it's overflowing.
   * Indexed by position rather than a stable id: live DOM `.page` elements
   * only carry `data-page-id` right after a full doc.write() from
   * serializeDocument (undo/redo, version load) — during normal editing
   * (drag, insert, page add/duplicate) the attribute is simply absent. */
  function checkOverflow() {
    const doc = getDoc();
    if (!doc) return;
    const pageEls = Array.from(doc.querySelectorAll<HTMLElement>(".page"));
    const overflowing = new Set<number>();
    pageEls.forEach((pageEl, i) => {
      const isOver = isPageOverflowing(pageEl);
      pageEl.style.outline = isOver ? "4px solid var(--bad, #e05a5a)" : "";
      pageEl.style.outlineOffset = isOver ? "-4px" : "";
      if (isOver) overflowing.add(i);
    });
    setOverflowPageIndices(overflowing);
  }

  /** Moves the last block on an overflowing page onto the top of the next
   * page (creating a blank one if it's the last page) — the one-click fix
   * offered next to the red overflow outline, per the "push overflow to
   * next page" ask. */
  /** Pushes overflow forward as far as it needs to go, not just one page
   * at a time: after moving a page's last block onto the front of the
   * next page, if THAT push makes the next page overflow too, the cascade
   * continues from there (creating further blank pages as needed) until
   * every page it touched fits. Content order is preserved throughout —
   * every step is "move the tail block to the front of the very next
   * page," a single linear list, never a reorder or a skip — this is the
   * closest a fixed-size, manually-triggered pagination model gets to
   * true reflow without rebuilding real print pagination. */
  function onPushOverflow(pageIndex: number) {
    const doc = getDoc();
    if (!doc) return;
    let idx = pageIndex;
    const MAX_CASCADE_STEPS = 500; // backstop against a pathological single block that overflows every page on its own
    for (let step = 0; step < MAX_CASCADE_STEPS; step++) {
      const pageEls = Array.from(doc.querySelectorAll<HTMLElement>(".page"));
      const page = pageEls[idx];
      if (!page || !isPageOverflowing(page)) break;
      const cols = page.querySelector<HTMLElement>(".page__cols");
      const lastBlock = cols?.lastElementChild as HTMLElement | null;
      if (!cols || !lastBlock) break;

      let nextPage = pageEls[idx + 1];
      if (!nextPage) {
        nextPage = doc.createElement("div");
        nextPage.className = "page";
        nextPage.innerHTML = '<div class="page__cols"></div>';
        page.after(nextPage);
      }
      const nextCols = nextPage.querySelector<HTMLElement>(".page__cols")!;
      nextCols.insertBefore(lastBlock, nextCols.firstChild);
      idx++; // keep cascading from whichever page just received the overflow, in case it now overflows too
    }
    stampBlockIds(doc);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
    markDirty();
  }

  // Split live-update from commit for the same reason as the property
  // panel's sliders (see SliderRow's onCommit doc comment): dragging this
  // slider used to push one undo checkpoint per tick.
  function onGlobalFontSize(px: number) {
    const doc = getDoc();
    if (!doc) return;
    doc.querySelectorAll<HTMLElement>(".page").forEach((p) => p.style.setProperty("--fs-base", `${px}px`));
    setPageFontSizePx(px);
  }

  function onRemoveBlock() {
    if (!selectedBlock) return;
    selectedBlock.remove();
    setSelectedBlock(null);
    setSelectedSubPart(null);
    setSelectedSubBlock(null);
    markDirty();
  }

  function onDuplicateBlock() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const clone = selectedBlock.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-block-id");
    selectedBlock.after(clone);
    stampBlockIds(doc);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
    setSelectedBlock(clone);
    setSelectedSubPart(null);
    setSelectedSubBlock(null);
    markDirty();
  }

  function onMoveBlockToPage(pageIndex: number) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const pageEls = Array.from(doc.querySelectorAll<HTMLElement>(".page"));
    const targetCols = pageEls[pageIndex]?.querySelector<HTMLElement>(".page__cols");
    if (!targetCols) return;
    targetCols.appendChild(selectedBlock);
    markDirty();
  }

  function onSaveEditedHtml(newHtml: string) {
    const doc = getDoc();
    if (!doc || !editHtmlTarget) return;
    const fragment = doc.createRange().createContextualFragment(newHtml);
    const replacement = fragment.firstElementChild as HTMLElement | null;
    if (replacement) {
      editHtmlTarget.replaceWith(replacement);
      stampBlockIds(doc);
      makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
      setSelectedBlock(replacement);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
    }
    setEditHtmlTarget(null);
    markDirty();
  }

  function currentPageIndexOf(el: HTMLElement, doc: Document): number {
    const pageEl = el.closest<HTMLElement>(".page");
    return Array.from(doc.querySelectorAll(".page")).indexOf(pageEl as Element);
  }

  // Bulk actions for multi-select — mirror the single-block versions above
  // but operate over every id in multiSelectedIds at once.
  function onBulkDelete() {
    const doc = getDoc();
    if (!doc) return;
    multiSelectedIdsRef.current.forEach((id) => doc.querySelector(`[data-block-id="${id}"]`)?.remove());
    setMultiSelectedIds(new Set());
    setSelectedBlock(null);
    setSelectedSubPart(null);
    setSelectedSubBlock(null);
    markDirty();
  }

  function onBulkDuplicate() {
    const doc = getDoc();
    if (!doc) return;
    multiSelectedIdsRef.current.forEach((id) => {
      const el = doc.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      if (!el) return;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-block-id");
      el.after(clone);
    });
    stampBlockIds(doc);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
    setMultiSelectedIds(new Set());
    markDirty();
  }

  function onBulkMoveToPage(pageIndex: number) {
    const doc = getDoc();
    const pageEls = doc ? Array.from(doc.querySelectorAll<HTMLElement>(".page")) : [];
    const targetCols = pageEls[pageIndex]?.querySelector<HTMLElement>(".page__cols");
    if (!doc || !targetCols) return;
    multiSelectedIdsRef.current.forEach((id) => {
      const el = doc.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      if (el) targetCols.appendChild(el);
    });
    setMultiSelectedIds(new Set());
    markDirty();
  }

  // Floating text-selection toolbar actions — all operate on whatever
  // Range is currently live in the iframe's own Selection, bounded to
  // `selectedBlock` so a stray selection elsewhere in the document can't
  // be reformatted by a toolbar anchored to a different block.
  function onTextBold() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    toggleInlineTag(doc, "bold");
    markDirty();
  }
  function onTextItalic() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    toggleInlineTag(doc, "italic");
    markDirty();
  }
  function onTextUnderline() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    toggleInlineTag(doc, "underline");
    markDirty();
  }
  function onTextFontStep(deltaEm: number) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    stepSelectionFontSize(doc, selectedBlock, deltaEm);
    markDirty();
  }
  function onTextColor(hex: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    wrapSelection(doc, selectedBlock, "text-color", ["--tc-c", hex]);
    markDirty();
  }
  function onTextHighlight(hex: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    wrapSelection(doc, selectedBlock, "highlight", ["--hl-c", hex]);
    markDirty();
  }
  function onTextClear() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    clearSelectionFormatting(doc, selectedBlock);
    markDirty();
  }

  // Image resize (drag corner handle) — for a figure's image, keep using
  // the same --fig-w CSS-var pattern the property panel's slider already
  // writes, so both controls stay in sync and export identically; any
  // other (generically-discovered) image sub-part without that var just
  // gets a direct inline width.
  function onResizeSelectedImageWidth(widthPx: number) {
    if (!selectedSubPart) return;
    // The width var belongs to whichever entity actually owns it — for a
    // figure nested inside a `.figure-grid`, that's the individual
    // <figure> (selectedSubBlock), never the shared wrapper.
    const widthTarget = selectedSubBlock ?? selectedBlock;
    const figWidthCv = widthTarget && registryEntryFor(widthTarget).entry.cssVars?.find((cv) => cv.cssVar === "--fig-w");
    if (figWidthCv && widthTarget) {
      // Clamp to the SAME range the property panel's width slider uses —
      // dragging past it used to desync the two controls: a native <input
      // type="range"> silently clamps an out-of-bounds `value` to its own
      // min, which then fights the slider's next re-render and makes it
      // look stuck/unresponsive.
      const clamped = Math.min(figWidthCv.max ?? widthPx, Math.max(figWidthCv.min ?? widthPx, widthPx));
      applyFigureWidth(widthTarget, clamped);
    } else {
      selectedSubPart.style.width = `${widthPx}px`;
      selectedSubPart.style.maxWidth = "100%";
    }
  }

  /** Height has no CSS-var equivalent to --fig-w — figure.css deliberately
   * uses height:auto so the image's own aspect ratio drives it. Dragging
   * the dedicated height-only edge handle is an explicit override of that
   * (a deliberate crop/stretch), so it always writes straight onto the
   * actual image/slot element rather than trying to go through a shared
   * variable — object-fit:cover keeps it looking like a clean crop instead
   * of a squished image once height no longer matches the natural aspect
   * ratio. */
  function onResizeSelectedImageHeight(heightPx: number) {
    if (!selectedSubPart) return;
    selectedSubPart.style.height = `${heightPx}px`;
    selectedSubPart.style.objectFit = "cover";
  }

  function onInsertBlock(snippetHtml: string) {
    const doc = getDoc();
    if (!doc) return;
    const targetCols = selectedBlock?.parentElement ?? doc.querySelector(".page__cols");
    if (!targetCols) return;
    const fragment = doc.createRange().createContextualFragment(snippetHtml);
    const inserted = fragment.firstElementChild as HTMLElement | null;
    if (selectedBlock) {
      selectedBlock.after(fragment);
    } else {
      targetCols.appendChild(fragment);
    }
    if (inserted) {
      stampBlockIds(doc);
      makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
      setSelectedBlock(inserted);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
    }
    markDirty();
  }

  async function onSave() {
    const doc = getDoc();
    if (!doc || !bookId) return;
    setSaving(true);
    setError(null);
    try {
      const serialized = "<!doctype html>\n" + doc.documentElement.outerHTML;
      const label = window.prompt("Label this save (optional)", "") ?? undefined;
      const version = await saveVersion(bookId, serialized, label || undefined, book?.current_version_id ?? undefined);
      setDirty(false);
      await load(version.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRevert(versionId: string) {
    if (!bookId) return;
    if (!window.confirm("Revert to this version? This creates a new save copying it.")) return;
    try {
      const version = await revertToVersion(bookId, versionId);
      setShowHistory(false);
      await load(version.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revert failed");
    }
  }

  function onPreviewVersion(versionId: string) {
    if (!bookId) return;
    getVersionHtml(bookId, versionId).then(setHtml);
    setShowHistory(false);
  }

  function runFindSearch(query: string) {
    const doc = getDoc();
    matchesRef.current = doc ? findMatches(doc, query) : [];
    if (matchesRef.current.length > 0) {
      setCurrentMatchIndex(0);
      const doc2 = getDoc();
      if (doc2) highlightMatch(doc2, matchesRef.current[0]);
    } else {
      setCurrentMatchIndex(-1);
    }
  }

  function onFindQueryChange(q: string) {
    setFindQuery(q);
    runFindSearch(q);
  }

  function stepMatch(delta: number) {
    const doc = getDoc();
    if (!doc || matchesRef.current.length === 0) return;
    const next = (currentMatchIndex + delta + matchesRef.current.length) % matchesRef.current.length;
    setCurrentMatchIndex(next);
    highlightMatch(doc, matchesRef.current[next]);
  }

  function onReplaceCurrent() {
    const doc = getDoc();
    if (!doc || currentMatchIndex < 0 || !matchesRef.current[currentMatchIndex]) return;
    replaceMatch(matchesRef.current[currentMatchIndex], replaceQuery);
    markDirty();
    // Text just changed underneath — every remaining match's offsets in
    // that same text node are now stale, so re-run the search fresh
    // rather than trying to patch the existing list in place.
    runFindSearch(findQuery);
  }

  function onReplaceAllMatches() {
    const doc = getDoc();
    if (!doc || !findQuery) return;
    replaceAllMatches(doc, findQuery, replaceQuery);
    markDirty();
    runFindSearch(findQuery);
  }

  function scrollToPage(n: number) {
    const doc = getDoc();
    const mainEl = mainRef.current;
    const pageEl = doc?.querySelectorAll<HTMLElement>(".page")[n - 1];
    if (!mainEl || !pageEl) return;
    // The iframe is visually scaled, so the real scroll position is the
    // page's native offsetTop scaled down to match — scrollIntoView()
    // inside the iframe wouldn't do anything, since the iframe itself no
    // longer has internal overflow (see the canvas-scale change above).
    mainEl.scrollTo({ top: pageEl.offsetTop * canvasScaleRef.current, behavior: "smooth" });
  }

  /** Live-DOM page operations, mirroring the block-level pattern: mutate
   * the real `.book > .page` structure directly (instant visual feedback,
   * no full re-render), then commitToModel() to checkpoint it for
   * undo/redo — same reasoning as every block-level action. */
  function withBookContainer(fn: (book: HTMLElement, pageEls: HTMLElement[]) => void) {
    const doc = getDoc();
    const book = doc?.querySelector<HTMLElement>(".book");
    if (!doc || !book) return;
    fn(book, Array.from(book.querySelectorAll<HTMLElement>(".page")));
    stampBlockIds(doc);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
    markDirty();
  }

  function onAddPage(afterIndex: number) {
    withBookContainer((book, pageEls) => {
      const blank = getDoc()!.createElement("div");
      blank.className = "page";
      blank.innerHTML = '<div class="page__cols"></div>';
      if (afterIndex < 0 || !pageEls[afterIndex]) {
        book.insertBefore(blank, pageEls[0] ?? null);
      } else {
        pageEls[afterIndex].after(blank);
      }
    });
  }

  function onDuplicatePage(index: number) {
    withBookContainer((_book, pageEls) => {
      const source = pageEls[index];
      if (!source) return;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-page-id");
      clone.querySelectorAll("[data-block-id]").forEach((el) => el.removeAttribute("data-block-id"));
      source.after(clone);
    });
  }

  function onDeletePage(index: number) {
    withBookContainer((_book, pageEls) => {
      pageEls[index]?.remove();
    });
  }

  function onReorderPages(fromIndex: number, toIndex: number) {
    withBookContainer((_book, pageEls) => {
      const moving = pageEls[fromIndex];
      if (!moving) return;
      const target = pageEls[toIndex];
      if (fromIndex < toIndex) target?.after(moving);
      else target?.before(moving);
    });
  }

  if (!book) {
    return <div style={{ padding: 40, color: "var(--ink-500)" }}>{error ?? "Loading…"}</div>;
  }

  // Everything below is fresh-each-render geometry for the floating
  // overlays — never cached in state, always read live off the DOM, kept
  // in sync by the tick() bumps wired into scroll/selectionchange above.
  const doc = getDoc();
  const iframeEl = iframeRef.current;
  const singleSelected = selectedBlock && multiSelectedIds.size <= 1;

  let textToolbarRect: ScreenRect | null = null;
  if (doc && iframeEl && selectedBlock) {
    const sel = doc.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (selectedBlock.contains(range.commonAncestorContainer)) {
        const r = range.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) textToolbarRect = toOuterRect(iframeEl, r, canvasScale);
      }
    }
  }

  let blockToolbarRect: ScreenRect | null = null;
  let panelAnchorRect: ScreenRect | null = null;
  if (doc && iframeEl && selectedBlock) {
    blockToolbarRect = toOuterRect(iframeEl, selectedBlock.getBoundingClientRect(), canvasScale);
    if (singleSelected) {
      const anchorEl = selectedSubPart ?? selectedSubBlock ?? selectedBlock;
      panelAnchorRect = toOuterRect(iframeEl, anchorEl.getBoundingClientRect(), canvasScale);
    }
  }

  // The toolbar (drag/duplicate/move/delete) always describes the real
  // draggable block — but property-panel and resize-handle computations
  // use whichever entity is actually being edited (selectedSubBlock, when
  // set, for a composite wrapper like `.figure-grid`).
  const registryEntry = selectedBlock ? registryEntryFor(selectedBlock).entry : null;
  const propertyEntity = selectedSubBlock ?? selectedBlock;
  const propertyEntry = propertyEntity ? registryEntryFor(propertyEntity).entry : null;
  const imageSubPartActive = !!(
    propertyEntity && propertyEntry && isImageSubPart(propertyEntity, selectedSubPart, propertyEntry)
  );
  let imageHandlesRect: ScreenRect | null = null;
  let imageAspect = 1;
  if (doc && iframeEl && selectedSubPart && imageSubPartActive && singleSelected) {
    const r = selectedSubPart.getBoundingClientRect();
    imageHandlesRect = toOuterRect(iframeEl, r, canvasScale);
    imageAspect = r.width && r.height ? r.width / r.height : 1;
  }

  const pageCount = doc ? doc.querySelectorAll(".page").length : 0;
  const currentPageIndex = doc && selectedBlock ? currentPageIndexOf(selectedBlock, doc) : -1;

  const overflowButtons =
    doc && iframeEl
      ? Array.from(overflowPageIndices)
          .map((idx) => {
            const pageEl = doc.querySelectorAll<HTMLElement>(".page")[idx];
            if (!pageEl) return null;
            return { idx, rect: toOuterRect(iframeEl, pageEl.getBoundingClientRect(), canvasScale) };
          })
          .filter((x): x is { idx: number; rect: ScreenRect } => !!x)
      : [];

  return (
    <div style={{ display: "grid", gridTemplateRows: "56px 1fr", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 18px",
          background: "var(--shell-850)",
          borderBottom: "1px solid var(--shell-700)",
        }}
      >
        <button className="btn icon-only" onClick={() => navigate("/")} title="Back to library">←</button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{book.title}</div>
        <div style={{ fontSize: 12, color: dirty ? "var(--warn)" : "var(--ink-500)" }}>
          {dirty ? "● Unsaved changes" : "✓ All changes saved"}
        </div>
        {lastAutosavedAt && (
          <div style={{ fontSize: 11, color: "var(--ink-500)" }} title="Autosave runs every 20s while there are unsaved changes">
            (autosaved at {lastAutosavedAt.toLocaleTimeString()})
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-500)" }} title="Page font size">
          <span>Aa</span>
          <input
            type="range"
            min={14}
            max={30}
            value={pageFontSizePx}
            onChange={(e) => onGlobalFontSize(Number(e.target.value))}
            onMouseUp={markDirty}
            onTouchEnd={markDirty}
            onKeyUp={markDirty}
            style={{ width: 90 }}
          />
        </div>
        <button className="btn icon-only" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↶</button>
        <button className="btn icon-only" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↷</button>
        <button
          className="btn"
          onClick={() => {
            const doc = getDoc();
            setTocEntries((cur) => (cur ? null : doc ? buildToc(doc) : []));
          }}
        >
          Outline
        </button>
        <button className="btn" onClick={() => setShowFind((s) => !s)}>Find</button>
        <button className="btn" onClick={() => setShowHistory((s) => !s)}>History</button>
        <a className="btn" href={exportUrl(book.id, "html", book.current_version_id ?? undefined)} target="_blank" rel="noreferrer">
          Export HTML
        </a>
        <button className="btn primary" onClick={onSave} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save version"}
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", minHeight: 0, position: "relative" }}>
        <PageThumbnailRail
          pages={pages}
          activePage={activePage}
          onSelect={scrollToPage}
          onReorder={onReorderPages}
          onAdd={onAddPage}
          onDuplicate={onDuplicatePage}
          onDelete={onDeletePage}
        />

        <main
          ref={mainRef}
          style={{
            overflow: "auto",
            background: "var(--shell-900)",
            display: "flex",
            justifyContent: "center",
            padding: "24px 0 60px",
          }}
        >
          {html !== null && (
            // Wrapper is sized to the POST-scale dimensions (transform
            // doesn't change layout size, only paint), so surrounding
            // scroll/centering behaves as if the page really were this
            // size — the iframe inside keeps its full native 1240px
            // layout and is just visually shrunk to fit.
            <div style={{ width: PAGE_W * canvasScale, height: contentHeight * canvasScale, flexShrink: 0 }}>
              <iframe
                ref={iframeRef}
                title="chapter-editor"
                style={{
                  width: PAGE_W,
                  height: contentHeight,
                  border: "none",
                  background: "white",
                  transform: `scale(${canvasScale})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
          )}
        </main>

        {singleSelected && (
          <PropertyPanel
            doc={doc}
            block={propertyEntity}
            subPart={selectedSubPart}
            onRemoveBlock={onRemoveBlock}
            onChanged={markDirty}
            onImageReplaced={(newEl) => {
              setSelectedSubPart(newEl);
              markDirty();
            }}
            anchorRect={panelAnchorRect}
          />
        )}

        {textToolbarRect && singleSelected && (
          <FloatingTextToolbar
            rect={textToolbarRect}
            onBold={onTextBold}
            onItalic={onTextItalic}
            onUnderline={onTextUnderline}
            onFontStep={onTextFontStep}
            onColor={onTextColor}
            onHighlight={onTextHighlight}
            onClear={onTextClear}
          />
        )}

        {blockToolbarRect && selectedBlock && (
          <FloatingBlockToolbar
            rect={blockToolbarRect}
            label={registryEntry?.label ?? "Block"}
            pageCount={pageCount}
            currentPageIndex={currentPageIndex}
            multiCount={multiSelectedIds.size || 1}
            onDuplicate={multiSelectedIds.size > 1 ? onBulkDuplicate : onDuplicateBlock}
            onDelete={multiSelectedIds.size > 1 ? onBulkDelete : onRemoveBlock}
            onMoveToPage={multiSelectedIds.size > 1 ? onBulkMoveToPage : onMoveBlockToPage}
            onEditHtml={() => setEditHtmlTarget(selectedBlock)}
            onInsertAfter={() => setShowInsert(true)}
          />
        )}

        {imageHandlesRect && (
          <ImageResizeHandles
            rect={imageHandlesRect}
            scale={canvasScale}
            aspectRatio={imageAspect}
            onResizeWidth={onResizeSelectedImageWidth}
            onResizeHeight={onResizeSelectedImageHeight}
            onCommit={markDirty}
          />
        )}

        {overflowButtons.map(({ idx, rect }) => (
          <button
            key={idx}
            className="btn"
            onClick={() => onPushOverflow(idx)}
            title={`Page ${idx + 1} overflows its print box — pushes overflow forward through as many pages as needed, without changing content order`}
            style={{
              position: "fixed",
              left: rect.left + rect.width - 230,
              top: rect.top + rect.height - 34,
              background: "var(--bad, #e05a5a)",
              color: "#fff",
              border: "none",
              fontSize: 11,
              zIndex: 38,
            }}
          >
            ⚠ Overflow — push forward until it fits →
          </button>
        ))}

        {editHtmlTarget && (
          <EditHtmlModal
            initialHtml={editHtmlTarget.outerHTML}
            onSave={onSaveEditedHtml}
            onClose={() => setEditHtmlTarget(null)}
          />
        )}

        {tocEntries && (
          <TocPanel
            entries={tocEntries}
            onClose={() => setTocEntries(null)}
            onJump={(pageIndex) => {
              scrollToPage(pageIndex + 1); // scrollToPage is 1-indexed, TocEntry.pageIndex is 0-indexed
              setTocEntries(null);
            }}
          />
        )}

        {showFind && (
          <FindReplacePanel
            query={findQuery}
            replacement={replaceQuery}
            matchCount={matchesRef.current.length}
            currentIndex={currentMatchIndex}
            onQueryChange={onFindQueryChange}
            onReplacementChange={setReplaceQuery}
            onNext={() => stepMatch(1)}
            onPrev={() => stepMatch(-1)}
            onReplace={onReplaceCurrent}
            onReplaceAll={onReplaceAllMatches}
            onClose={() => setShowFind(false)}
          />
        )}

        {showHistory && (
          <VersionHistoryPanel
            versions={versions}
            currentVersionId={book.current_version_id}
            onClose={() => setShowHistory(false)}
            onPreview={onPreviewVersion}
            onRevert={onRevert}
          />
        )}

        {showInsert && (
          <InsertBlockPalette onInsert={onInsertBlock} onClose={() => setShowInsert(false)} />
        )}

        <button
          className="btn primary"
          onClick={() => setShowInsert((s) => !s)}
          style={{
            position: "fixed",
            right: 24,
            bottom: 30,
            width: 46,
            height: 46,
            borderRadius: "50%",
            fontSize: 22,
            padding: 0,
          }}
          title="Insert block"
        >
          +
        </button>
      </div>

      {error && (
        <div style={{ position: "fixed", bottom: 16, left: 16, color: "var(--bad)", fontSize: 13 }}>{error}</div>
      )}
    </div>
  );
}
