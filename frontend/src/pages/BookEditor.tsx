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
import { ApiError } from "../api/client";
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
import { BookDocument, countWords, parseDocument, serializeDocument, renderSinglePageHtml } from "../editor/model";
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
import ContextMenu from "../components/ContextMenu/ContextMenu";
import SlashMenu from "../components/SlashMenu/SlashMenu";
import ShortcutHelp from "../components/ShortcutHelp/ShortcutHelp";
import Breadcrumb from "../components/Breadcrumb/Breadcrumb";
import Toasts, { useToasts } from "../components/Toasts/Toasts";
import { serializeForSave } from "../editor/sanitize";
import { ED, injectChromeStyles } from "../editor/chrome";
import {
  collectBlocks,
  collectPages,
  detectStructure,
  type DocumentStructure,
} from "../editor/structure";
import { detectCapabilities, NO_CAPABILITIES, type DocumentCapabilities } from "../editor/capabilities";
import { applyLink, attachPasteSanitizer, currentLink, removeLink } from "../editor/textEditing";
import {
  BLOCK_TYPES,
  caretPosition,
  convertBlockType,
  currentListItem,
  exitListFromEmptyItem,
  indentListItem,
  isAtomicBlock,
  mergeWithNext,
  mergeWithPrevious,
  outdentListItem,
  splitBlockAtCaret,
} from "../editor/blockEditing";
import { discoverTemplates, type BlockTemplate } from "../editor/blockTemplates";

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
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // How this particular document is shaped — paginated chapter vs ordinary
  // flowing HTML — detected on load rather than assumed. See structure.ts.
  const [structure, setStructure] = useState<DocumentStructure | null>(null);
  const structureRef = useRef<DocumentStructure | null>(null);
  const [capabilities, setCapabilities] = useState<DocumentCapabilities>(NO_CAPABILITIES);

  // Viewing an older version, rather than editing the current one.
  //
  // "Preview" used to just swap the canvas content with no flag, no undo
  // reset and no visual indication. Editing then marked the document dirty
  // and Save wrote the OLD version's content with the CURRENT version as its
  // parent — silently moving the head backwards and dropping every newer
  // edit from the document. Preview is now explicitly read-only, with the
  // only ways out being "restore this version" or "back to current".
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  // Right-click menu — the discoverable path to duplicate/move/delete that
  // ContextMenu.tsx was written for but never wired to anything.
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // null = fit to available width (the previous fixed behaviour); a number is
  // an explicit user-chosen zoom.
  const [zoomOverride, setZoomOverride] = useState<number | null>(null);

  const [autosaveFailures, setAutosaveFailures] = useState(0);
  // Link editor popover, opened either from the toolbar or by Ctrl+K.
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Slash menu: null when closed, otherwise the text typed after the "/".
  // The "/" and query stay in the document while the menu is open and are
  // removed only when an action runs, so cancelling leaves what was typed.
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  // Components the open document actually uses, offered in the insert
  // palette alongside the semantic defaults — so the palette reflects THIS
  // document's vocabulary instead of a fixed list of pipeline snippets. See
  // discoverTemplates. Recomputed when the document is (re)loaded, not on
  // every edit: a new component type appearing mid-session is rare, and
  // scanning every block on each keystroke commit is not worth it.
  const [discoveredTemplates, setDiscoveredTemplates] = useState<BlockTemplate[]>([]);

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
      // A class, never an inline style — inline styles written onto the
      // user's own elements get serialized into every save and export.
      el.classList.toggle(ED.multiSelected, multiSelectedIds.has(id));
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
  // Default only — the real width comes from the detected structure
  // (structure.contentWidthPx), so a flow document renders at a readable
  // column width instead of being stretched to A4-at-150dpi.
  const DEFAULT_PAGE_W = 1240;
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_W);
  const PAGE_W = pageWidth;
  const mainRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
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
  // Only identity here — deliberately NOT the rendered HTML.
  //
  // This memo used to call renderSinglePageHtml for every page on every model
  // change, and that function prepends the document's whole inlined
  // stylesheet (several MB in a real chapter) to each one. A 39-page chapter
  // therefore allocated ~120MB of strings on every single commit — every
  // slider release, text blur, drag and image swap — and retained them for as
  // long as the rail was mounted, to render thumbnails that are mostly
  // offscreen and already lazily mounted behind an IntersectionObserver.
  // Rendering moved into the thumbnail itself, so a page's HTML is only ever
  // built when that thumbnail actually becomes visible.
  const pages: PageEntry[] = useMemo(() => {
    if (!docModel) return [];
    return docModel.pages.map((p, i) => ({ id: p.id, index: i }));
  }, [docModel]);

  /** Words in the document. Derived from the model rather than the live DOM
   * so it recomputes exactly when content changes (on commit), not on every
   * scroll or selection tick — counting words in a 6MB chapter is not free. */
  const wordCount = useMemo(() => {
    if (!docModel) return null;
    const blockHtml = docModel.pages
      .flatMap((p) => [...p.fullBlocks, ...p.blocks])
      .map((b) => b.html)
      .join(" ");
    // A flow document keeps its content in the shell rather than in pages,
    // so fall back to that. countWords drops <style>/<script> bodies, without
    // which the fallback would count the entire inlined stylesheet as prose.
    return countWords(blockHtml.trim() ? blockHtml : docModel.prefix);
  }, [docModel]);

  const renderPageHtml = useCallback(
    (index: number) => (docModelRef.current ? renderSinglePageHtml(docModelRef.current, index) : ""),
    [],
  );

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
        // that somehow ended up genuinely empty would otherwise render as a
        // blank canvas with no explanation.
        //
        // The check is now "is there any content at all", not "does it parse
        // into .page divs with blocks". The old form counted blocks inside
        // parsed PAGES, so any document without this pipeline's page
        // structure — i.e. every ordinary HTML file — counted zero and was
        // rejected as corrupted even though it was perfectly fine.
        if (!/<[a-zA-Z][^>]*>/.test(h) || h.replace(/<[^>]*>/g, "").trim().length === 0) {
          if (h.length > 1000) {
            setError(
              "This saved version looks corrupted (no readable content found) — try reverting to an earlier version from History.",
            );
            return;
          }
        }
        setPreviewVersionId(null);
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
      // Never autosave while previewing an old version — that would persist
      // the version being LOOKED at as if it were an edit.
      if (previewVersionIdRef.current) return;
      const doc = getDoc();
      if (!doc) return;
      try {
        const serialized = serializeForSave(doc);
        const version = await saveVersion(bookId, serialized, "Autosave", bookRef.current?.current_version_id ?? undefined);
        setDirty(false);
        setBook((b) => (b ? { ...b, current_version_id: version.id } : b));
        setVersions((vs) => [version, ...vs]);
        setLastAutosavedAt(new Date());
        setAutosaveFailures(0);
      } catch (err) {
        // Previously an empty `catch {}`. `dirty` staying true does mean the
        // next tick retries — but with the failure invisible, a teacher could
        // edit for an hour watching "● Unsaved changes" while every single
        // attempt was rejected (an expired S3 credential does exactly this),
        // and only discover it on closing the tab. Retrying silently is
        // right; failing silently is not.
        setAutosaveFailures((n) => {
          const next = n + 1;
          if (next === 2) {
            pushToast(
              "error",
              `Autosave isn't working: ${err instanceof Error ? err.message : "unknown error"}. Your changes are still here, but they aren't being saved.`,
              { action: { label: "Retry now", run: () => void onSave() } },
            );
          }
          return next;
        });
      }
    }, 20000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const previewVersionIdRef = useRef<string | null>(null);
  useEffect(() => {
    previewVersionIdRef.current = previewVersionId;
  }, [previewVersionId]);

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
      const fit = Math.min(1, available / PAGE_W);
      setFitScale(fit);
      // An explicit zoom wins over fit-to-width; fit remains the default and
      // the value the "Fit" button returns to.
      setCanvasScale(zoomOverride ?? fit);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PAGE_W, zoomOverride]);

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

    // Editor-only stylesheet first, so nothing below has to express editor
    // state as an inline style on the user's own elements (see chrome.ts).
    injectChromeStyles(doc);

    // Work out what kind of document this is BEFORE anything tries to find
    // blocks or pages in it — everything downstream (stamping, drag, the
    // page rail, overflow detection, the canvas width) is driven by this
    // rather than by hardcoded pipeline selectors.
    const detected = detectStructure(doc);
    setStructure(detected);
    structureRef.current = detected;
    setPageWidth(detected.contentWidthPx || DEFAULT_PAGE_W);
    setCapabilities(detectCapabilities(doc));

    const model = parseDocument(html);
    setDocModel(model);
    docModelRef.current = model;
    onIframeLoad(detected);
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
    // Snapshots are taken from the SANITIZED document, so editor scaffolding
    // never enters the undo history either — otherwise an undo could restore
    // a state that reintroduced `data-block-id`s and chrome classes as if
    // they were content.
    const currentHtml = serializeForSave(doc);
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
    // Only meaningful for a paginated document. In flow mode there are no
    // `.page` divs at all, so the old "zero pages means corrupt" rule
    // declared every ordinary HTML document permanently broken and disabled
    // undo/redo outright with a "history looks corrupted" error.
    if (structureRef.current?.mode !== "paginated") {
      return snapshot.prefix.length > 0 || snapshot.pages.length > 0;
    }
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
  /** Block clipboard — the editor's own, not the OS one. Copying a whole
   * block as markup was simply not possible before: you could copy its TEXT
   * via the browser, but never the block itself, so there was no way to
   * repeat a styled element or move one between chapters. */
  const blockClipboardRef = useRef<string | null>(null);

  /**
   * The editor's keyboard layer, shared by the outer window and the iframe
   * (keydown inside an iframe doesn't bubble out to the parent, so both
   * documents register this same handler — see onIframeLoad).
   *
   * Only Ctrl+Z and Ctrl+F existed before, which meant bold/italic required
   * finding a floating toolbar with the mouse, there was no Save shortcut,
   * and a selected block could not be deleted or duplicated from the
   * keyboard at all.
   */
  // Deliberately NOT memoized. It calls onRemoveBlock/onDuplicateBlock/etc.,
  // which close over `selectedBlock` STATE — memoizing this on a narrow
  // dependency list pins those closures, so Delete would act on whichever
  // block was selected when that dependency last changed rather than the one
  // selected now. Recreated every render, and reached through a ref (below)
  // so listeners never need re-registering.
  /**
   * Enter / Backspace / Delete / Tab inside an editable block.
   *
   * Returns true when it handled the key. Split/merge/indent all mutate the
   * live DOM, then re-stamp and commit once — see blockEditing.ts for why
   * these need to exist at all (short version: without them you cannot add
   * or remove a paragraph by typing).
   */
  function handleBlockKey(e: KeyboardEvent, block: HTMLElement): boolean {
    const doc = getDoc();
    if (!doc) return false;

    const finish = (focus: HTMLElement, caretAtStart?: boolean) => {
      restampAfterMutation(doc);
      setContentEditable(focus, true);
      if (caretAtStart) {
        const range = doc.createRange();
        range.selectNodeContents(focus);
        range.collapse(true);
        const sel = doc.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setSelectedBlock(focus);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
      markDirty();
    };

    if (e.key === "Enter" && !e.shiftKey) {
      const li = currentListItem(doc, block);
      if (li) {
        // Inside a list the browser's own Enter already does the right thing
        // (a new <li>), so only the exception is handled here: an empty item
        // means "I'm done with this list".
        if (!li.textContent?.trim()) {
          e.preventDefault();
          const created = exitListFromEmptyItem(doc, block, li);
          finish(created ?? block);
          return true;
        }
        return false; // let the browser create the next <li>
      }
      if (isAtomicBlock(block)) return false;
      e.preventDefault();
      const created = splitBlockAtCaret(doc, block);
      if (created) finish(created, true);
      return true;
    }

    if (e.key === "Backspace") {
      const pos = caretPosition(doc, block);
      if (!pos?.atStart || !pos.collapsed) return false;
      const li = currentListItem(doc, block);
      if (li) {
        // Backspace at the start of a nested item outdents rather than
        // merging text across list levels.
        if (outdentListItem(doc, li)) {
          e.preventDefault();
          finish(block);
          return true;
        }
        return false;
      }
      const result = mergeWithPrevious(doc, block);
      if (!result) return false;
      e.preventDefault();
      finish(result.focusBlock);
      return true;
    }

    if (e.key === "Delete") {
      const pos = caretPosition(doc, block);
      if (!pos?.atEnd || !pos.collapsed) return false;
      const result = mergeWithNext(doc, block);
      if (!result) return false;
      e.preventDefault();
      finish(result.focusBlock);
      return true;
    }

    if (e.key === "Tab") {
      const li = currentListItem(doc, block);
      if (!li) return false;
      const moved = e.shiftKey ? outdentListItem(doc, li) : indentListItem(doc, li);
      if (!moved) return false;
      e.preventDefault();
      finish(block);
      return true;
    }

    return false;
  }

  /**
   * Tracks a "/" trigger while typing.
   *
   * The slash and everything typed after it stay in the document so the text
   * looks normal while choosing; `consumeSlashText` removes exactly that run
   * when an action fires. Abandoning the menu (Escape, moving the caret)
   * therefore leaves what was typed intact, rather than eating it.
   */
  function updateSlashState() {
    const doc = getDoc();
    const sel = doc?.getSelection();
    if (!doc || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return setSlashQuery(null);

    const node = sel.getRangeAt(0).startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return setSlashQuery(null);
    const text = (node.textContent ?? "").slice(0, sel.getRangeAt(0).startOffset);

    // A slash that begins a word — never mid-word, so "and/or" or a URL
    // typed into text doesn't pop the menu.
    const match = /(?:^|\s)\/([^\s/]*)$/.exec(text);
    setSlashQuery(match ? match[1] : null);
  }

  function consumeSlashText() {
    const doc = getDoc();
    const sel = doc?.getSelection();
    if (!doc || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const before = (node.textContent ?? "").slice(0, range.startOffset);
    const match = /\/[^\s/]*$/.exec(before);
    if (!match) return;
    const start = range.startOffset - match[0].length;
    (node as Text).deleteData(start, match[0].length);
    const cleaned = doc.createRange();
    cleaned.setStart(node, start);
    cleaned.collapse(true);
    sel.removeAllRanges();
    sel.addRange(cleaned);
  }

  function onConvertBlockType(tagName: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const replacement = convertBlockType(doc, selectedBlock, tagName);
    restampAfterMutation(doc);
    setSelectedBlock(replacement);
    setSelectedSubPart(null);
    setSelectedSubBlock(null);
    markDirty();
  }

  const handleEditorKey =
    (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const typing = !!target?.isContentEditable || ["INPUT", "TEXTAREA"].includes(target?.tagName ?? "");

      // Block structure keys come first — they only apply while actually
      // editing text inside a block, and must run before the block-level
      // Delete shortcut below (which deletes the WHOLE block).
      const editingBlock =
        target?.isContentEditable && target.closest<HTMLElement>("[data-block-id]");
      if (editingBlock && !mod && handleBlockKey(e, editingBlock)) return;

      // Ctrl+Alt+<n> changes block type — the standard binding, and the only
      // one that doesn't collide with browser or OS shortcuts.
      if (mod && e.altKey) {
        const match = BLOCK_TYPES.find(
          (t) => t.shortcut && t.shortcut.toLowerCase().endsWith(key),
        );
        if (match) {
          e.preventDefault();
          onConvertBlockType(match.tag);
          return;
        }
      }

      if (!mod) {
        if (e.key === "?" && !typing) {
          e.preventDefault();
          setShowShortcuts(true);
          return;
        }
        if (e.key === "Escape") {
          if (showShortcuts) return setShowShortcuts(false);
          if (slashQuery !== null) return setSlashQuery(null);
          // Step out one level: close a menu, leave text editing, then
          // finally clear the selection.
          if (contextMenu) return setContextMenu(null);
          if (typing && target?.isContentEditable) {
            setContentEditable(target, false);
            commitToModel();
            return;
          }
          setSelectedBlock(null);
          setSelectedSubPart(null);
          setSelectedSubBlock(null);
          setMultiSelectedIds(new Set());
          return;
        }
        // Delete only acts on a block when NOT typing — otherwise it would
        // eat the character the user meant to delete.
        if ((e.key === "Delete" || e.key === "Backspace") && !typing && selectedBlockRef.current) {
          e.preventDefault();
          if (multiSelectedIdsRef.current.size > 1) onBulkDelete();
          else onRemoveBlock();
        }
        return;
      }

      switch (key) {
        case "z":
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          break;
        case "y": // Windows convention for redo
          e.preventDefault();
          redo();
          break;
        case "f":
          e.preventDefault();
          setShowFind(true);
          break;
        case "k":
          // Ctrl+K is the universal "make this a link" binding.
          if (selectedBlockRef.current) {
            e.preventDefault();
            setLinkEditorOpen(true);
          }
          break;
        case "s":
          e.preventDefault();
          void onSave();
          break;
        case "b":
          if (typing) {
            e.preventDefault();
            onTextBold();
          }
          break;
        case "i":
          if (typing) {
            e.preventDefault();
            onTextItalic();
          }
          break;
        case "u":
          if (typing) {
            e.preventDefault();
            onTextUnderline();
          }
          break;
        case "d":
          if (!typing && selectedBlockRef.current) {
            e.preventDefault();
            if (multiSelectedIdsRef.current.size > 1) onBulkDuplicate();
            else onDuplicateBlock();
          }
          break;
        case "c":
          if (!typing && selectedBlockRef.current) {
            e.preventDefault();
            blockClipboardRef.current = selectedBlockRef.current.outerHTML;
            pushToast("success", "Block copied");
          }
          break;
        case "x":
          if (!typing && selectedBlockRef.current) {
            e.preventDefault();
            blockClipboardRef.current = selectedBlockRef.current.outerHTML;
            onRemoveBlock();
          }
          break;
        case "v":
          if (!typing && blockClipboardRef.current) {
            e.preventDefault();
            onInsertBlock(blockClipboardRef.current);
          }
          break;
        default:
          break;
      }
    };

  // Latest-ref indirection. Both listeners (the outer window, and the iframe
  // document — keydown inside an iframe doesn't bubble out) are registered
  // ONCE with a stable wrapper, which always dispatches to the current
  // handler. That keeps registration cheap while guaranteeing the handler
  // sees current state, which is the whole point of not memoizing above.
  const handleEditorKeyRef = useRef(handleEditorKey);
  useEffect(() => {
    handleEditorKeyRef.current = handleEditorKey;
  }); // no dependency array — refresh after EVERY render

  const iframeKeyHandler = useRef((e: KeyboardEvent) => handleEditorKeyRef.current(e)).current;

  useEffect(() => {
    window.addEventListener("keydown", iframeKeyHandler);
    return () => window.removeEventListener("keydown", iframeKeyHandler);
  }, [iframeKeyHandler]);

  /** Cleanup for listeners registered on elements OUTSIDE the iframe.
   * Anything attached to the iframe's own document dies with it on the next
   * `doc.write()`, but a listener on the outer <main> does not — and this
   * function runs again on every version load, undo and redo. Each run used
   * to add another scroll handler that was never removed, every one holding
   * a stale `pageEls` array from a document that no longer exists. */
  const outerListenerCleanupRef = useRef<(() => void) | null>(null);

  function onIframeLoad(structure: DocumentStructure) {
    const doc = getDoc();
    if (!doc) return;

    outerListenerCleanupRef.current?.();
    outerListenerCleanupRef.current = null;

    stampBlockIds(doc, structure);
    setDiscoveredTemplates(discoverTemplates(collectBlocks(doc, structure)));
    attachPasteSanitizer(doc);
    // Nested-item (single figure in a pair, single bullet line) drag must
    // attach BEFORE the block-level drag below — see attachNestedItemReorder's
    // own doc comment for why registration order here isn't arbitrary.
    makeNestedItemsDraggable(doc);
    attachNestedItemReorder(doc, markDirty);
    makeBlocksDraggable(doc);
    attachDragReorder(doc, structure, markDirty);

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
        //
        // Applied as a class, not as a dozen inline styles: the inline
        // version was serialized into every save and export, permanently
        // baking placeholder chrome into the document even after the image
        // was fixed. See chrome.ts.
        img.alt = "चित्र यहाँ आएगा — क्लिक करके जोड़ें";
        img.classList.add(ED.brokenImage);
        img.title = "Image not available — click to upload one";
      },
      true,
    );

    const pageEls = collectPages(doc, structure);

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
      outerListenerCleanupRef.current = () => mainEl.removeEventListener("scroll", onScroll);
    }

    checkOverflow();

    const firstPage = pageEls[0];
    if (firstPage) {
      const fs = parseFloat(firstPage.style.getPropertyValue("--fs-base"));
      setPageFontSizePx(fs || 20);
    }

    // Right-click anywhere on a block opens the same actions the floating
    // toolbar offers. ContextMenu.tsx already implemented all of this and was
    // never imported by anything — right-click did nothing at all.
    doc.addEventListener("contextmenu", (e) => {
      const block = findBlockAncestor(e.target as Element);
      if (!block) return;
      e.preventDefault();
      setSelectedBlock(block);
      const iframeRect = iframeRef.current?.getBoundingClientRect();
      const scale = canvasScaleRef.current;
      setContextMenu({
        x: (iframeRect?.left ?? 0) + e.clientX * scale,
        y: (iframeRect?.top ?? 0) + e.clientY * scale,
      });
    });

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
    doc.addEventListener("selectionchange", () => {
      tickOnScroll();
      updateSlashState();
    });
    // keyup, not keydown: the character has to be IN the document before
    // the query after "/" can be read from it.
    doc.addEventListener("keyup", updateSlashState);

    // The full keyboard layer, while focus is inside the iframe — keydown
    // there does NOT bubble to the parent window, so the same handler has to
    // be registered on both documents. Reusing handleEditorKey (rather than
    // the duplicated undo/find-only subset that lived here) is what makes
    // Ctrl+B/I/U work while typing, which is where they are actually needed.
    doc.addEventListener("keydown", iframeKeyHandler);

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
      findImgTarget(e.target as Element)?.classList.add(ED.dropTarget);
    });
    doc.addEventListener("dragleave", (e) => {
      findImgTarget(e.target as Element)?.classList.remove(ED.dropTarget);
    });
    doc.addEventListener("drop", (e) => {
      const imgTarget = findImgTarget(e.target as Element);
      if (!imgTarget) return;
      e.preventDefault();
      imgTarget.classList.remove(ED.dropTarget);
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
        placed.classList.remove(ED.brokenImage);
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

  /** Pages of the currently-loaded document — [] in flow mode, where the
   * concept doesn't apply. Replaces the `.page` selector that was hardcoded
   * at eleven separate call sites. */
  function pagesOf(doc: Document): HTMLElement[] {
    const structure = structureRef.current;
    return structure ? collectPages(doc, structure) : [];
  }

  /** Where blocks live inside a page. A packaged chapter puts them in
   * `.page__cols`; any other paginated document holds them directly, so the
   * page element itself is the container. */
  function blockContainerOf(pageEl: HTMLElement): HTMLElement {
    const selector = structureRef.current?.blockContainerSelectors[0];
    return (selector ? pageEl.querySelector<HTMLElement>(selector) : null) ?? pageEl;
  }

  /** Re-stamps ids and re-arms draggability after any structural mutation.
   * Every mutating action needs the same three calls in the same order; they
   * were repeated (and in two places mis-indented, in one place duplicated)
   * at six separate call sites, which is exactly how one of them ends up
   * quietly missing a step. */
  function restampAfterMutation(doc: Document) {
    const structure = structureRef.current;
    if (!structure) return;
    stampBlockIds(doc, structure);
    makeNestedItemsDraggable(doc);
    makeBlocksDraggable(doc);
  }

  function markDirty() {
    // Editing while previewing an older version is refused rather than
    // silently accepted — see previewVersionId.
    if (previewVersionIdRef.current) return;
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
    const structure = structureRef.current;
    if (!doc || !structure) return;
    // Meaningless in flow mode: content that grows just makes the document
    // longer, which is correct, not an error to flag.
    if (structure.mode !== "paginated") {
      setOverflowPageIndices(new Set());
      return;
    }
    const pageEls = collectPages(doc, structure);
    const overflowing = new Set<number>();
    pageEls.forEach((pageEl, i) => {
      const isOver = isPageOverflowing(pageEl);
      // A class rather than an inline outline — the inline version was being
      // written into every save and export, so a chapter could ship with a
      // red border burned into the page. See chrome.ts.
      pageEl.classList.toggle(ED.overflow, isOver);
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
      const pageEls = pagesOf(doc);
      const page = pageEls[idx];
      if (!page || !isPageOverflowing(page)) break;
      const cols = blockContainerOf(page);
      const lastBlock = cols?.lastElementChild as HTMLElement | null;
      if (!cols || !lastBlock) break;

      let nextPage = pageEls[idx + 1];
      if (!nextPage) {
        nextPage = makeBlankPageLike(page);
        page.after(nextPage);
      }
      const nextCols = blockContainerOf(nextPage);
      nextCols.insertBefore(lastBlock, nextCols.firstChild);
      idx++; // keep cascading from whichever page just received the overflow, in case it now overflows too
    }
    restampAfterMutation(doc);
    markDirty();
  }

  // Split live-update from commit for the same reason as the property
  // panel's sliders (see SliderRow's onCommit doc comment): dragging this
  // slider used to push one undo checkpoint per tick.
  function onGlobalFontSize(px: number) {
    const doc = getDoc();
    if (!doc) return;
    pagesOf(doc).forEach((p) => p.style.setProperty("--fs-base", `${px}px`));
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
    restampAfterMutation(doc);
    setSelectedBlock(clone);
    setSelectedSubPart(null);
    setSelectedSubBlock(null);
    markDirty();
  }

  function onMoveBlockToPage(pageIndex: number) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const pageEls = pagesOf(doc);
    const targetCols = pageEls[pageIndex] ? blockContainerOf(pageEls[pageIndex]) : null;
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
      restampAfterMutation(doc);
      setSelectedBlock(replacement);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
    }
    setEditHtmlTarget(null);
    markDirty();
  }

  function currentPageIndexOf(el: HTMLElement, doc: Document): number {
    const pageEl = el.closest<HTMLElement>(".page");
    return pageEl ? pagesOf(doc).indexOf(pageEl) : -1;
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
    restampAfterMutation(doc);
    setMultiSelectedIds(new Set());
    markDirty();
  }

  function onBulkMoveToPage(pageIndex: number) {
    const doc = getDoc();
    const pageEls = doc ? pagesOf(doc) : [];
    const targetCols = pageEls[pageIndex] ? blockContainerOf(pageEls[pageIndex]) : null;
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
  // Both go through the document's detected capabilities: a packaged chapter
  // gets the pipeline's semantic `.text-color`/`.highlight` spans, and any
  // other document gets a self-contained inline style. Emitting the class
  // unconditionally — the old behaviour — meant picking a colour in an
  // ordinary document produced a span with no styling behind it, so nothing
  // visibly happened at all.
  function onTextColor(hex: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    wrapSelection(doc, selectedBlock, capabilities.textColor, hex);
    markDirty();
  }
  function onTextHighlight(hex: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    wrapSelection(doc, selectedBlock, capabilities.highlight, hex);
    markDirty();
  }
  function onTextClear() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    clearSelectionFormatting(doc, selectedBlock);
    markDirty();
  }

  function onApplyLink(href: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    if (!applyLink(doc, selectedBlock, href)) {
      pushToast("error", "That doesn't look like a usable web address.");
      return;
    }
    setLinkEditorOpen(false);
    markDirty();
  }

  function onRemoveLink() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    removeLink(doc, selectedBlock);
    setLinkEditorOpen(false);
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
    // Insert next to whatever's selected; with nothing selected, fall back to
    // the first page's block container, or (flow mode) the content root.
    const firstPage = pagesOf(doc)[0];
    const targetCols =
      selectedBlock?.parentElement ??
      (firstPage ? blockContainerOf(firstPage) : structureRef.current?.root ?? null);
    if (!targetCols) return;
    const fragment = doc.createRange().createContextualFragment(snippetHtml);
    const inserted = fragment.firstElementChild as HTMLElement | null;
    if (selectedBlock) {
      selectedBlock.after(fragment);
    } else {
      targetCols.appendChild(fragment);
    }
    if (inserted) {
      restampAfterMutation(doc);
      setSelectedBlock(inserted);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
    }
    markDirty();
  }

  async function onSave(force = false) {
    const doc = getDoc();
    if (!doc || !bookId) return;
    if (previewVersionIdRef.current) {
      pushToast("info", "You're previewing an older version — restore it first to make changes.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // serializeForSave, never raw outerHTML: the live DOM carries the
      // editor's own scaffolding, which would otherwise be written into the
      // stored version and every export. See sanitize.ts.
      const serialized = serializeForSave(doc);
      const label = force ? "Overwrote a conflicting save" : window.prompt("Label this save (optional)", "") ?? undefined;
      const version = await saveVersion(
        bookId,
        serialized,
        label || undefined,
        book?.current_version_id ?? undefined,
        force,
      );
      setDirty(false);
      setAutosaveFailures(0);
      await load(version.id);
      pushToast("success", "Saved");
    } catch (err) {
      // A 409 means someone else saved since this session started editing —
      // recoverable, and worth offering a real choice rather than the same
      // generic red text as a network failure.
      if (err instanceof ApiError && err.status === 409) {
        pushToast("error", err.message, {
          action: { label: "Overwrite", run: () => void onSave(true) },
        });
      } else {
        pushToast("error", err instanceof Error ? err.message : "Save failed");
      }
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

  /**
   * Show an older version WITHOUT adopting it.
   *
   * This used to simply call `setHtml` with the old content and nothing
   * else: no flag, no undo reset, no indication anywhere in the UI. Editing
   * then marked the document dirty as normal, and Save wrote the OLD
   * version's HTML with the CURRENT version as its parent — moving the head
   * backwards and dropping every newer edit from the document, presented as
   * an ordinary successful save. Two clicks from the history panel.
   *
   * Preview is now an explicit, visible, read-only mode: markDirty and
   * onSave both refuse while it's active, and the only ways out are
   * "restore this version" or "back to current".
   */
  function onPreviewVersion(versionId: string) {
    if (!bookId) return;
    if (dirty && !window.confirm("You have unsaved changes. Preview an older version anyway?")) return;
    getVersionHtml(bookId, versionId).then((h) => {
      setPreviewVersionId(versionId);
      setHtml(h);
      // Undo history belongs to the document being edited, not to the one
      // being looked at — mixing snapshots from two different versions is
      // how a "restore" ends up applying half of each.
      historyRef.current = [];
      futureRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    });
    setShowHistory(false);
  }

  function exitPreview() {
    setPreviewVersionId(null);
    void load();
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

  /** Scrolls the outer canvas so `el` (inside the scaled iframe) comes into
   * view — used by both the page rail and the outline, the latter of which
   * has no page numbers to work with in a flow document. */
  function scrollToElement(el: HTMLElement) {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    mainEl.scrollTo({ top: el.offsetTop * canvasScaleRef.current, behavior: "smooth" });
  }

  function scrollToPage(n: number) {
    const doc = getDoc();
    const mainEl = mainRef.current;
    const pageEl = doc ? pagesOf(doc)[n - 1] : undefined;
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
    const structure = structureRef.current;
    // The pages' own parent, whatever it is — `.book` was a hardcoded
    // assumption that simply doesn't hold outside this repo's pipeline, so
    // every page operation silently did nothing in any other document.
    const container = doc ? pagesOf(doc)[0]?.parentElement ?? structure?.root : null;
    if (!doc || !container) return;
    fn(container as HTMLElement, pagesOf(doc));
    restampAfterMutation(doc);
    markDirty();
  }

  /**
   * A new empty page shaped like an existing one.
   *
   * New pages were built as a literal `<div class="page"><div
   * class="page__cols"></div></div>`. That's correct only for this repo's
   * own chapters: in any other paginated document those class names mean
   * nothing, so the "page" had none of the sizing or layout the real ones
   * get from CSS and appeared as a collapsed sliver. Cloning the structure
   * of a real page — its classes and attributes, minus its content — gets
   * it right for every document without knowing any class names.
   */
  function makeBlankPageLike(model: HTMLElement): HTMLElement {
    const blank = model.cloneNode(false) as HTMLElement;
    blank.removeAttribute("data-page-id");
    const selector = structureRef.current?.blockContainerSelectors[0];
    const modelContainer = selector ? model.querySelector<HTMLElement>(selector) : null;
    if (modelContainer) {
      const container = modelContainer.cloneNode(false) as HTMLElement;
      container.removeAttribute("data-block-id");
      blank.appendChild(container);
    }
    return blank;
  }

  function onAddPage(afterIndex: number) {
    withBookContainer((book, pageEls) => {
      const model = pageEls[Math.max(0, afterIndex)] ?? pageEls[0];
      if (!model) return; // no page to model a new one on (flow document)
      const blank = makeBlankPageLike(model);
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

  // Caret position in outer-page coordinates, for anchoring the slash menu.
  // A collapsed range has zero width and getBoundingClientRect can report an
  // empty rect for it, so fall back to the block's own box rather than
  // rendering the menu at 0,0.
  let textCaretRect: ScreenRect | null = null;
  if (doc && iframeEl && selectedBlock) {
    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const usable = r.width > 0 || r.height > 0 ? r : selectedBlock.getBoundingClientRect();
      textCaretRect = toOuterRect(iframeEl, usable, canvasScale);
    }
  }

  // Read live at render time, like every other selection-derived value here,
  // so the link button reflects whatever the caret is currently inside.
  const existingLinkHref =
    doc && selectedBlock ? currentLink(doc, selectedBlock)?.getAttribute("href") ?? null : null;

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

  const pageCount = doc ? pagesOf(doc).length : 0;
  const currentPageIndex = doc && selectedBlock ? currentPageIndexOf(selectedBlock, doc) : -1;

  const overflowButtons =
    doc && iframeEl
      ? Array.from(overflowPageIndices)
          .map((idx) => {
            const pageEl = pagesOf(doc)[idx];
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
        <button
          className="btn icon-only"
          // beforeunload only guards closing/reloading the TAB. Navigating
          // within the app is a plain React Router transition it never sees,
          // so this button silently discarded up to 20s of unsaved edits.
          onClick={() => {
            if (dirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
            navigate("/");
          }}
          title="Back to library"
        >
          ←
        </button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{book.title}</div>
        {previewVersionId ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--warn)",
                border: "1px solid var(--warn)",
                borderRadius: 5,
                padding: "2px 8px",
              }}
            >
              👁 Previewing an older version — read only
            </span>
            <button className="btn" style={{ fontSize: 11 }} onClick={exitPreview}>
              Back to current
            </button>
            <button
              className="btn primary"
              style={{ fontSize: 11 }}
              onClick={() => onRevert(previewVersionId)}
            >
              Restore this version
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: dirty ? "var(--warn)" : "var(--ink-500)" }}>
            {dirty ? "● Unsaved changes" : "✓ All changes saved"}
          </div>
        )}
        {structure && (
          <span
            style={{ fontSize: 10.5, color: "var(--ink-500)", border: "1px solid var(--shell-700)", borderRadius: 4, padding: "1px 6px" }}
            title={
              structure.mode === "paginated"
                ? "Fixed pages detected — page rail and overflow checking are active"
                : "Continuous document — no fixed pages, so page features are off"
            }
          >
            {structure.mode === "paginated" ? "paginated" : "flow"}
          </span>
        )}
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
        {/* Zoom — the canvas was previously locked to fit-to-width with no
            way to look closely at anything. */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: "var(--ink-500)" }}>
          <button
            className="btn icon-only"
            title="Zoom out"
            onClick={() => setZoomOverride(Math.max(0.2, (zoomOverride ?? fitScale) - 0.1))}
          >
            −
          </button>
          <button
            className="btn"
            style={{ padding: "6px 8px", minWidth: 54 }}
            title="Reset to fit width"
            onClick={() => setZoomOverride(null)}
          >
            {zoomOverride === null ? "Fit" : `${Math.round(canvasScale * 100)}%`}
          </button>
          <button
            className="btn icon-only"
            title="Zoom in"
            onClick={() => setZoomOverride(Math.min(3, (zoomOverride ?? fitScale) + 0.1))}
          >
            +
          </button>
        </div>
        <button className="btn icon-only" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↶</button>
        <button className="btn icon-only" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↷</button>
        <button
          className="btn"
          onClick={() => {
            const doc = getDoc();
            const structure = structureRef.current;
            setTocEntries((cur) => (cur ? null : doc && structure ? buildToc(doc, structure) : []));
          }}
        >
          Outline
        </button>
        {wordCount !== null && (
          <span
            style={{ fontSize: 11, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}
            title="Words in this document"
          >
            {wordCount.toLocaleString()} words
          </span>
        )}
        <button className="btn" onClick={() => setShowFind((s) => !s)}>Find</button>
        <button
          className="btn icon-only"
          onClick={() => setShowShortcuts(true)}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          ?
        </button>
        <button className="btn" onClick={() => setShowHistory((s) => !s)}>History</button>
        <a className="btn" href={exportUrl(book.id, "html", book.current_version_id ?? undefined)} target="_blank" rel="noreferrer">
          Export HTML
        </a>
        <button
          className="btn primary"
          onClick={() => void onSave()}
          disabled={saving || !dirty || !!previewVersionId}
          title="Save version (Ctrl+S)"
        >
          {saving ? "Saving…" : "Save version"}
        </button>
      </header>

      {/* The page rail only exists in a paginated document — in flow mode
          there are no pages to show, so the column collapses entirely rather
          than reserving space for an empty rail. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: structure?.mode === "paginated" ? "76px 1fr" : "1fr",
          minHeight: 0,
          position: "relative",
        }}
      >
        {structure?.mode === "paginated" && (
          <PageThumbnailRail
            pages={pages}
            renderHtml={renderPageHtml}
            activePage={activePage}
            onSelect={scrollToPage}
            onReorder={onReorderPages}
            onAdd={onAddPage}
            onDuplicate={onDuplicatePage}
            onDelete={onDeletePage}
          />
        )}

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
                // SECURITY: the canvas is written via document.write and so
                // inherits this app's origin. Without a sandbox, any
                // <script> in an uploaded document executes with full access
                // to parent.localStorage — where the access and refresh
                // tokens live — making a malicious upload a complete account
                // takeover. That was survivable only while every document
                // came from this repo's own script-free pipeline; it stops
                // being survivable the moment arbitrary HTML is accepted.
                //
                // `allow-same-origin` WITHOUT `allow-scripts` is the exact
                // combination needed: the parent can still read and mutate
                // contentDocument (which is the whole editing mechanism),
                // while scripts inside the document never run. Markup is
                // preserved untouched, so a document's own scripts survive
                // a round-trip through the editor without ever executing.
                sandbox="allow-same-origin"
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
            capabilities={capabilities}
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
            existingHref={existingLinkHref}
            linkEditorOpen={linkEditorOpen}
            onLinkEditorOpenChange={setLinkEditorOpen}
            onApplyLink={onApplyLink}
            onRemoveLink={onRemoveLink}
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
            currentTag={selectedBlock.tagName.toLowerCase()}
            paginated={structure?.mode === "paginated"}
            onConvertType={onConvertBlockType}
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
            onJump={(entry) => {
              // Jump by element, not by page number — a flow document has no
              // pages, and jumping to the heading itself is more precise than
              // "the top of the page it happens to be on" even when it does.
              scrollToElement(entry.el);
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
          <InsertBlockPalette
            discovered={discoveredTemplates}
            onInsert={onInsertBlock}
            onClose={() => setShowInsert(false)}
          />
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

      {slashQuery !== null && textCaretRect && singleSelected && (
        <SlashMenu
          rect={textCaretRect}
          query={slashQuery}
          discovered={discoveredTemplates}
          onInsert={(html) => {
            consumeSlashText();
            onInsertBlock(html);
            setSlashQuery(null);
          }}
          onConvert={(tag) => {
            consumeSlashText();
            onConvertBlockType(tag);
            setSlashQuery(null);
          }}
          onClose={() => setSlashQuery(null)}
        />
      )}

      {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}

      {contextMenu && selectedBlock && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          label={registryEntry?.label ?? "Block"}
          pageCount={pageCount}
          currentPageIndex={currentPageIndex}
          onDuplicate={onDuplicateBlock}
          onDelete={onRemoveBlock}
          onMoveToPage={onMoveBlockToPage}
          onEditHtml={() => setEditHtmlTarget(selectedBlock)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <Breadcrumb
        selected={selectedSubPart ?? selectedSubBlock ?? selectedBlock}
        root={structure?.root ?? null}
        onSelect={(el) => {
          setSelectedBlock(el);
          setSelectedSubPart(null);
          setSelectedSubBlock(null);
        }}
      />

      {/* Replaces the single never-dismissing line of red text in the corner
          that could only ever show one problem at a time. */}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {error && (
        <div style={{ position: "fixed", bottom: 16, left: 16, color: "var(--bad)", fontSize: 13 }}>{error}</div>
      )}
    </div>
  );
}
