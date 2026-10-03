"use client"

// ─────────────────────────────────────────────────────────────────────────────
// PORTED VERBATIM from the standalone editor's `pages/BookEditor.tsx`.
//
// Only three things changed, and none of them is behaviour:
//   · import paths (`../editor/*` -> `@/lib/book-editor/*`)
//   · the API module, whose CONTRACT is unchanged — see `lib/book-editor/api`
//   · `react-router`'s `useParams`/`useNavigate` became props, because the
//     dashboard routes by folder and the page above already knows which
//     chapter it is showing
//
// Everything else — drag assist and grip arming, the free layer, decorator
// placement, math atomicity, the pagination cascade, undo checkpoints, every
// keyboard shortcut and all ~50 panel callbacks — is the original code. It
// took real effort to make the drag comfortable; re-deriving it would have
// thrown that away and called the result a rewrite.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Book,
  BookVersion,
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
  nearestTableCell,
  isEmptyImageSlot,
  stampBlockIds,
  allBlocks,
} from "../editor/selection";
import { applyFigureWidth, isImageSubPart, registryEntryFor } from "../editor/propertyRegistry";
import { attachDragAssist, attachGripArming, cancelDrag } from "../editor/dragDrop";
import { manifestElementFor } from "../editor/manifest";
import {
  isFree, liftToPage, moveFree, overlappingFlow, placeFreshlyInserted,
  returnToFlow,
} from "../editor/freeLayer";
import { applyMathToSelection, formatMathBeforeCaret } from "../editor/mathInput";
import {
  addItem,
  firstTextSlot,
  itemGroupFor,
  splitItemGroup,
  removeItem,
} from "../editor/itemEditing";
import {
  DECOR_CLASS,
  advisePlacement,
  enableDecoratorDragging,
  resizeDecorator,
  fetchAsDataUrl,
  placeDecorator,
  type DecoratorItem,
} from "../editor/decorators";
import {
  clearSelectionFormatting,
  MATH_EMPHASIS_CLASS,
  mathTargetOf,
  toggleMathEmphasis,
  setContentEditable,
  stepSelectionFontSize,
  toggleInlineTag,
  wrapSelection,
  insertAtCaret,
  wrapSelectionAsVector,
} from "../editor/textEditing";
import { fileToDataUrl } from "../editor/imageSwap";
import {
  makeBlocksDraggable,
  attachDragReorder,
  makeNestedItemsDraggable,
  attachNestedItemReorder,
} from "../editor/dragDrop";
import { markMathAtomic, attachMathEditing } from "../editor/mathAtomic";
import { BookDocument, countWords, parseDocument, serializeDocument, renderSinglePageHtml } from "../editor/model";
import { ScreenRect, isPageOverflowing, toOuterRect } from "../editor/geometry";
import { PageEntry } from "../components/PageThumbnailRail/PageThumbnailRail";
import PropertyPanel from "../components/PropertyPanel/PropertyPanel";
import PageThumbnailRail from "../components/PageThumbnailRail/PageThumbnailRail";
import VersionHistoryPanel from "../components/VersionHistoryPanel/VersionHistoryPanel";
import InsertBlockPalette from "../components/InsertBlockPalette/InsertBlockPalette";
import DecoratorPanel from "../components/DecoratorPanel/DecoratorPanel";
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
import "@/app/book-editor/editor-theme.css";
import { serializeForSave } from "../editor/sanitize";
import { ED, injectChromeStyles, setChromeClass } from "../editor/chrome";
import {
  appendLine, insertLineAfter, lineOf, lineParentOf, removeLine,
} from "../editor/lineUnits";
import { describeRun, moveRun, questionRun } from "../editor/questionRun";
import {
  collectBlocks,
  collectPages,
  detectStructure,
  minSafeViewportWidth,
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


/** The innermost declared component between `target` and `block`.
 *
 * Returns null when the click landed on the block itself, so callers keep
 * treating the block as the thing being edited. Only content elements count:
 * a `.u` margin guard or a `.flowwrap` between them is scaffolding, and
 * selecting one is never what a click meant. */
/** Keys that END an expression, so `mv/qB` becomes a fraction without
 * having to remember a trailing space. Enter and the Devanagari danda
 * matter as much as the space does in Hindi prose. */
const MATH_FINISH_KEYS = new Set([" ", "Enter", ",", ";", "।", ")"]);

function findManifestEntity(target: Element, block: Element): HTMLElement | null {
  let node: Element | null = target;
  while (node && node !== block) {
    const m = manifestElementFor(node);
    if (m && m.role === "content") return node as HTMLElement;
    node = node.parentElement;
  }
  return null;
}

export default function BookEditor() {
  const { bookId = "" } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [versions, setVersions] = useState<BookVersion[]>([]);
  const [html, setHtml] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsert, setShowInsert] = useState(false);
  const [showDecorators, setShowDecorators] = useState(false);
  const [placingDecorator, setPlacingDecorator] = useState(false);
  /** Art currently being dragged out of the panel. Held here rather than in
   * `dataTransfer` because the drop lands inside the canvas iframe, and
   * custom dataTransfer types do not read back reliably across that boundary. */
  const draggedDecoratorRef = useRef<DecoratorItem | null>(null);
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
  const [autoReflow, setAutoReflow] = useState(true);
  const autoReflowRef = useRef(true);
  useEffect(() => { autoReflowRef.current = autoReflow; }, [autoReflow]);
  const reflowTimerRef = useRef<number | null>(null);
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
  // Read from a timer callback (the reflow debounce), which closes over the
  // render it was created in and would otherwise always settle from page 1.
  const activePageRef = useRef(1);

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
  /** Width the iframe is given, which is at least the document's own
   *  responsive breakpoint — see minSafeViewportWidth. */
  const [viewportWidth, setViewportWidth] = useState(0);
  const PAGE_W = Math.max(pageWidth, viewportWidth);
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
        flushPendingCommit();
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
  // Ring the selected picture. MUST live above the `if (!book)` early return
  // below: a hook placed after it never runs on the first render, and React
  // then sees a different number of hooks once the book loads and throws —
  // which showed up as a blank editor page, not as an obviously broken ring.
  useEffect(() => {
    const d = getDoc();
    if (!d) return;
    // One ring at a time, cleared before it is re-applied — a stale ring on a
    // previously-selected picture is worse than none.
    d.querySelectorAll(`.${ED.selectedArt}`).forEach((n) => n.classList.remove(ED.selectedArt));
    const art = selectedBlock?.classList.contains(DECOR_CLASS) ? selectedBlock : null;
    if (art) art.classList.add(ED.selectedArt);
  }, [selectedBlock, getDoc]);

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
    // The VIEWPORT the document is laid out in, which is not the same as the
    // width of a page. See minSafeViewportWidth: a 1080px iframe is under
    // this chapter's own 1100px breakpoint, so opening a file triggered its
    // mobile layout and the book stopped matching itself. The page still
    // centres itself inside the wider canvas (`.page { margin: 26px auto }`),
    // so nothing looks different — the narrow-screen rules simply stop
    // firing.
    setViewportWidth(minSafeViewportWidth(doc));
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
    // Any debounced checkpoint must land BEFORE popping history, or the most
    // recent edits would never have been recorded and undo would skip them.
    flushPendingCommit();
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
    flushPendingCommit();
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
  // Mirrors blockClipboardRef into render-visible state, purely so the
  // toolbar's Paste button can grey out when there is nothing to paste —
  // the ref itself is silent to React and would leave a stale enabled
  // button after the very first cut/copy of the session.
  const [clipboardHasBlock, setClipboardHasBlock] = useState(false);
  /** The one block currently wearing the standing "new" marker. */
  const freshBlockRef = useRef<HTMLElement | null>(null);

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

  /**
   * Is this a row Enter should make another of?
   *
   * "Nested item" now covers far more than it did: a question number, a
   * marks pill, each exam-paper tag, the frequency seal on a heading — all
   * deliberately pickable, so they can be moved and deleted one at a time.
   * But they are CHIPS, not rows, and Enter with the caret inside one was
   * cloning it: pressing Enter while editing `प्र. 6` produced a second
   * question number. A row is something a box stacks; a chip is something a
   * line contains.
   *
   * Tag rather than computed display, for the same reason as panelSplit's
   * check — this is asked in jsdom and in the browser alike.
   */
  function isRepeatableRow(row: HTMLElement): boolean {
    const INLINE = new Set(["SPAN", "B", "I", "EM", "STRONG", "A", "CODE",
                            "SUP", "SUB", "SMALL", "U", "S", "MARK"]);
    return !INLINE.has(row.tagName);
  }

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
      // Enter inside a repeated ROW makes another row of the same kind, in
      // the same container — a sixth step in the reading-order card, another
      // line in a Derivation Steps note, another row in a सूत्र panel.
      //
      // Without this the caret was inside a `.cvstep`, and Enter ran the
      // block-level split: it cut the whole CARD in two at the caret, so a
      // teacher pressing Enter to add a step got half their card torn off
      // into a second one. Lists are left alone above — the browser's own
      // Enter already produces a correct `<li>`.
      const anchorNode = doc.getSelection()?.anchorNode ?? null;
      const anchorEl =
        anchorNode && (anchorNode.nodeType === 3 ? anchorNode.parentElement : (anchorNode as Element));
      const row = anchorEl?.closest<HTMLElement>("[data-nested-item]") ?? null;
      if (row && block.contains(row) && isRepeatableRow(row)) {
        const group = itemGroupFor(row);
        if (group && group.items.length >= 2) {
          e.preventDefault();
          // `addItem` renumbers the group itself — see its doc comment for
          // why that is not left to the caller.
          const created = addItem(group, row);
          restampAfterMutation(doc);
          // The caret belongs in the new row's own text, not on the row
          // wrapper — a `.cvstep` starts with its number badge, and landing
          // the caret before that would type into the numbering.
          const target = firstTextSlot(created);
          // A card is edited as one contenteditable block; a sticky note is
          // edited one `.ci` line at a time. Make the NEW row editable only
          // in the second case — turning the whole note editable would change
          // how it behaves for every other edit.
          if (!block.isContentEditable) setContentEditable(target, true);
          const range = doc.createRange();
          range.selectNodeContents(target);
          range.collapse(true);
          const sel = doc.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          (target as HTMLElement).scrollIntoView?.({ block: "nearest" });
          markDirty();
          return true;
        }
      }

      if (isAtomicBlock(block)) return false;
      e.preventDefault();
      const created = splitBlockAtCaret(doc, block);
      if (created) finish(created, true);
      return true;
    }

    // Space finishes an expression: `V = W/q ` becomes a real stacked
    // fraction the moment it is complete. Only the token just typed is
    // considered, so prose is never silently reformatted — and a formula that
    // was NOT wanted is one Ctrl+Z away, because this pushes a checkpoint.
    // Space is not the only place an expression ends. `r = mv/qB,` and
    // `… = mv/qB।` and a line finished with Enter were all left as literal
    // text because only a space triggered the conversion — so writing maths
    // meant remembering to type a trailing space.
    if (MATH_FINISH_KEYS.has(e.key) && !e.ctrlKey && !e.metaKey) {
      if (formatMathBeforeCaret(doc)) {
        markDirty();
        // Only the SPACE is swallowed — it belongs after the formula and the
        // browser would otherwise insert it inside the fraction we just
        // built. A comma or a danda still has to be typed.
        if (e.key === " ") return false;
      }
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
          // Delete acts on the SMALLEST thing selected. With one exam stamp
          // picked out of four on a heading, deleting the whole heading is
          // never what was meant — and there was no other way to remove just
          // that stamp.
          else if (!deleteSelectedItem()) onRemoveBlock();
        }

        // Arrow keys nudge placed art, the way every design tool does.
        // Dragging a 40px clipboard into exactly the right spot with a mouse
        // on a scaled canvas is fiddly; 1px steps (10 with Shift) are not.
        if (!typing && selectedBlockRef.current?.classList.contains(DECOR_CLASS)) {
          const art = selectedBlockRef.current;
          const step = e.shiftKey ? 10 : 1;
          const move = (dx: number, dy: number) => {
            e.preventDefault();
            art.style.left = `${(parseFloat(art.style.left) || 0) + dx}px`;
            art.style.top = `${(parseFloat(art.style.top) || 0) + dy}px`;
            markDirty();
          };
          if (e.key === "ArrowLeft") move(-step, 0);
          else if (e.key === "ArrowRight") move(step, 0);
          else if (e.key === "ArrowUp") move(0, -step);
          else if (e.key === "ArrowDown") move(0, step);
        }

        // A lifted block moves with the arrows too — same reason art does:
        // placing something exactly on a scaled canvas with a mouse is fiddly.
        if (!typing && selectedBlockRef.current && isFree(selectedBlockRef.current)) {
          const b = selectedBlockRef.current;
          // ENTER SETTLES IT INTO THE TEXT.
          //
          // A block placed by insertion floats so that adding it does not
          // shove the page around — but it has to be able to STOP floating,
          // or a chapter accumulates boxes that are pinned to coordinates and
          // do not reflow with the text around them. Enter is the one key
          // that reads as "yes, there" once a thing has been dragged into
          // position.
          if (e.key === "Enter") {
            e.preventDefault();
            if (returnToFlow(b)) {
              setChromeClass(b, ED.placedFree, false);
              commitNow();
              pushToast("success",
                        "Fitted into the text — it reflows with the page now.");
            } else {
              pushToast("info",
                        "This one has no place in the text to return to — drag it where you want it and leave it there.");
            }
            return;
          }
          const step = e.shiftKey ? 10 : 1;
          const go = (dx: number, dy: number) => {
            e.preventDefault();
            moveFree(b, dx, dy);
            markDirty();
          };
          if (e.key === "ArrowLeft") go(-step, 0);
          else if (e.key === "ArrowRight") go(step, 0);
          else if (e.key === "ArrowUp") go(0, -step);
          else if (e.key === "ArrowDown") go(0, step);
        }

        // A sticky note sits alone in `.stickycol`, a float column. There is
        // nothing to reorder it against, so ordinary block drag cannot move
        // it at all — the only way to shift one down the page is to offset it
        // inside its column. Vertical only: the column's width is the layout.
        if (!typing && selectedBlockRef.current && isStickyNote(selectedBlockRef.current)) {
          const note = selectedBlockRef.current;
          const step = e.shiftKey ? 10 : 2;
          const nudge = (dy: number) => {
            e.preventDefault();
            nudgeStickyNote(note, dy);
            markDirty();
          };
          if (e.key === "ArrowUp") nudge(-step);
          else if (e.key === "ArrowDown") nudge(step);
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
        case "h":
          // Ctrl+Shift+H — box and bold the formula under the caret. Shift,
          // because Ctrl+H alone is the browser's history on Windows.
          if (e.shiftKey) {
            e.preventDefault();
            onEmphasiseMath();
          }
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
            onCopyBlock();
          }
          break;
        case "x":
          if (!typing && selectedBlockRef.current) {
            e.preventDefault();
            onCutBlock();
          }
          break;
        case "v":
          if (!typing && blockClipboardRef.current) {
            e.preventDefault();
            onPasteBlock();
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


  /** Lets art be dragged out of the library and dropped on a page.
   *
   * The drop lands INSIDE the canvas iframe, which is a separate document
   * from the panel the drag started in, so the item travels via
   * `draggedDecoratorRef` rather than through `dataTransfer`.
   *
   * `dragover` must call preventDefault or the browser refuses the drop
   * entirely — that is the default "this is not a drop target" behaviour and
   * it is silent. The guard on the ref keeps this from interfering with the
   * editor's OWN block-reorder drags, which are also HTML5 drags in this same
   * document.
   */


  /** A note floating in the margin column, rather than a block in the text. */
  function isStickyNote(el: HTMLElement): boolean {
    return !!el.closest(".stickycol") && !el.classList.contains("stickycol");
  }

  /** Shifts a sticky note down (or up) its float column.
   *
   * Written as a margin on the note itself, so the text that wraps around the
   * column reflows to match. Clamped at the top because a negative offset
   * would lift the note off the page, and `.page` is `overflow:hidden` — it
   * would simply disappear rather than hang over the edge.
   */
  function nudgeStickyNote(note: HTMLElement, dy: number) {
    const current = parseFloat(note.style.marginTop) || 0;
    note.style.marginTop = `${Math.max(0, Math.round(current + dy))}px`;
  }


  /**
   * Double-click puts the caret where you clicked and starts editing.
   *
   * There was no `dblclick` handler in the editor at all, which is why
   * double-tapping a sticky note or a card did nothing: the first click
   * selected the block, the second did the same again, and getting into the
   * text was a matter of finding a third gesture that happened to work.
   *
   * It also turns OFF dragging on the thing being edited, for as long as it is
   * being edited. `draggable="true"` and `contenteditable` on the same element
   * is the classic conflict — the browser hands mousedown-and-move to the drag
   * engine, so selecting a word by dragging across it picks the block up
   * instead. Disarming just the edited element leaves every other block
   * draggable, so nothing is taken away.
   */
  function attachDoubleClickToEdit(doc: Document) {
    doc.addEventListener("dblclick", (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const block = target.closest<HTMLElement>("[data-block-id]");
      if (!block) return;

      // The smallest named region under the cursor — a note's line, a card's
      // step — falling back to the block itself.
      const { entry } = registryEntryFor(block);
      const region =
        findSubPart(target, block, Object.keys(entry.subParts ?? {})) ??
        target.closest<HTMLElement>("[data-nested-item]") ??
        nearestTableCell(target, block) ??
        block;
      if (region.querySelector("img") && !region.textContent?.trim()) return;

      e.preventDefault();
      e.stopPropagation();

      // Disarm this element and its ancestors while it is editable, and put
      // them back when focus leaves.
      const rearm: HTMLElement[] = [];
      for (let n: HTMLElement | null = region; n && n !== doc.body; n = n.parentElement) {
        if (n.draggable) { n.draggable = false; rearm.push(n); }
      }
      const restore = () => {
        rearm.forEach((n) => (n.draggable = true));
        region.removeEventListener("blur", restore, true);
      };
      region.addEventListener("blur", restore, true);

      setSelectedBlock(block);
      setSelectedSubPart(region === block ? null : region);
      setContentEditable(region, true);
      region.focus();

      // Caret where the pointer actually was, so a double-click reads as
      // "edit HERE" rather than "edit somewhere in this box".
      //
      // `caretRangeFromPoint` lives on Document, never on Window — this was
      // reading it off `doc.defaultView`, where the property has never
      // existed under any name, in any browser. The optional chaining
      // swallowed the miss silently, so this never once placed a caret: a
      // double-click always dropped it wherever `.focus()` happens to land
      // (typically the very start of the region), which on a multi-line box
      // reads as "the click landed in the wrong place" — it landed nowhere
      // at all.
      const withCaretApi = doc as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      const range = withCaretApi.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range) {
        const sel = doc.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      markDirty();
    });
  }

  function attachDecoratorDrop(doc: Document) {
    const over = (e: DragEvent) => {
      if (!draggedDecoratorRef.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const drop = (e: DragEvent) => {
      const item = draggedDecoratorRef.current;
      if (!item) return;
      const page = (e.target as Element | null)?.closest<HTMLElement>(".page");
      if (!page) return;
      e.preventDefault();
      e.stopPropagation();
      draggedDecoratorRef.current = null;
      // Page-local coordinates: the iframe is rendered at a scale, and the
      // page may be scrolled, so a viewport point has to be rebased onto the
      // page's own box before it means anything as a `left`/`top`.
      const r = page.getBoundingClientRect();
      const scale = r.width / page.offsetWidth || 1;
      void onPlaceDecorator(item, {
        page,
        dropAt: { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale },
      });
    };
    doc.addEventListener("dragover", over);
    doc.addEventListener("drop", drop);
  }

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
    attachNestedItemReorder(doc, () => { commitNow(); noteMoved(); });
    makeBlocksDraggable(doc);
    attachDragReorder(doc, structure, () => { commitNow(); noteMoved(); },
                      () => Array.from(multiSelectedIdsRef.current));
    attachDecoratorDrop(doc);
    // Fractions become single atoms for the caret BEFORE the general
    // double-click-to-edit handler is attached, so a double-click on a
    // formula opens the formula rather than the paragraph around it.
    markMathAtomic(doc);
    attachMathEditing(doc, () => commitNow());
    attachDoubleClickToEdit(doc);
    // One armed drag source, taken hold of at a block's left edge — see
    // makeBlocksDraggable for why arming everything at once made both
    // dragging and text editing unreliable.
    attachGripArming(doc, () => selectedBlockRef.current);
    attachDragAssist(
      doc,
      // The OUTER <main> is what scrolls — see the note at the top of this
      // effect. The canvas document has no overflow of its own.
      () => mainRef.current,
      () => { cancelDrag(doc); pushToast("info", "Drag cancelled — nothing moved."); },
      // The visible band, expressed in the canvas's own coordinates so it can
      // be compared against a drag event's clientY.
      () => {
        const mainEl = mainRef.current;
        const frame = iframeRef.current;
        if (!mainEl || !frame) return null;
        const k = canvasScaleRef.current || 1;
        const m = mainEl.getBoundingClientRect();
        const f = frame.getBoundingClientRect();
        return { top: (m.top - f.top) / k, bottom: (m.bottom - f.top) / k };
      },
      () => canvasScaleRef.current || 1,
    );

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
        activePageRef.current = bestIdx + 1;
        // Mark the sheet on the paper itself. `activePage` already existed
        // but only reached a label in the status bar, which is not where
        // anyone editing a page is looking — so while editing there was no
        // way to tell one sheet from the next, or to notice crossing from
        // one to another. See ED.activePage in chrome.ts.
        pageEls.forEach((el, i) =>
          setChromeClass(el, ED.activePage, i === bestIdx));
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

    checkOverflow({ reflow: false });

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

      // The "new" marker has done its job the moment you touch the block it
      // is pointing at — or click away from it. Leaving it on would turn a
      // findability aid into permanent clutter.
      const fresh = freshBlockRef.current;
      if (fresh) {
        fresh.classList.remove(ED.freshBlock);
        freshBlockRef.current = null;
      }

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

      // SHIFT-click takes the RANGE; Ctrl/Cmd-click toggles one.
      //
      // Shift-click used to toggle a single block, so selecting six meant six
      // shift-clicks and one misplaced click undid part of the set. Every
      // file list and spreadsheet in existence uses shift for a range and the
      // modifier key for individuals; six blocks is now two clicks.
      if ((e.shiftKey || e.ctrlKey || e.metaKey) && block) {
        const id = block.dataset.blockId;
        if (id && (e.ctrlKey || e.metaKey)) {
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
        } else if (id) {
          // Anchor: whatever was singly selected, or the earliest block
          // already in the set.
          const anchorId = selectedBlockRef.current?.dataset.blockId
            ?? Array.from(multiSelectedIdsRef.current)[0];
          const all = allBlocks(doc);
          const ai = all.findIndex((b) => b.dataset.blockId === anchorId);
          const bi = all.findIndex((b) => b.dataset.blockId === id);
          if (ai < 0 || bi < 0) {
            setMultiSelectedIds(new Set([id]));
          } else {
            const [lo, hi] = ai <= bi ? [ai, bi] : [bi, ai];
            setMultiSelectedIds(new Set(
              all.slice(lo, hi + 1)
                 .map((b) => b.dataset.blockId)
                 .filter((x): x is string => !!x)));
          }
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
        // Genuinely blank page space — below the last line, or in an empty
        // column — had nothing to click INTO: no block means no caret and
        // no paste target, so "click empty space, cursor appears" only ever
        // worked inside existing text. Only the bare structural containers
        // count as "blank" here (an exact match, not just "no data-block-id
        // ancestor") so this never fires on a banner chip or free-floating
        // decoration that merely isn't wrapped as a normal block.
        if (target.matches(".page, .flowwrap, .acol") || target === blockContainerOf(target.closest<HTMLElement>(".page") ?? doc.body)) {
          const container = target.closest<HTMLElement>(".acol, .flowwrap, .page");
          if (container) {
            const p = doc.createElement("p");
            p.appendChild(doc.createElement("br"));
            appendLine(container, p);
            restampAfterMutation(doc);
            setSelectedBlock(p);
            setContentEditable(p, true);
            p.focus();
            markDirty();
          }
        }
        return;
      }

      // A block can be a composite wrapper around several independent
      // figures (`.figure-grid`) — when the click landed inside one of
      // its nested <figure>s, that figure (not the wrapper) is the real
      // "entity" for width/image/caption editing purposes, even though
      // `block` stays what the toolbar drags/duplicates/deletes.
      // A block can be a ROW holding several real components — the BEM
      // `.figure-grid`, and now any `.figrow` the side-by-side control
      // creates. A click inside one means the component it landed on, not
      // the row: the row stays what the toolbar drags and deletes, while
      // width / image / caption editing applies to the figure clicked.
      //
      // `.figure` is the BEM class; `findManifestEntity` covers the current
      // library, so this works for whatever the row happens to contain
      // rather than only for figures.
      const nestedFigure =
        target.closest<HTMLElement>(".figure") ?? findManifestEntity(target, block);
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
        // LAST RESORT: THE ROW UNDER THE CURSOR.
        //
        // Both lookups above go through the element library — an inline span
        // it declares, or a named part of this element. A repeated row often
        // is neither: an MCQ option is a bare `<div>` inside `.opts`, a
        // bullet is an `<li>`. The drag layer had already marked them as
        // items, so they could be dragged, and yet clicking one selected
        // nothing in particular — so "move this option up" had nothing to
        // act on and the row buttons never appeared. Selecting the row makes
        // the smallest thing you pointed at the thing the toolbar acts on,
        // which is what Delete already assumed (see deleteSelectedItem).
        if (!sub) {
          const row = target.closest<HTMLElement>("[data-nested-item]");
          if (row && editEntity.contains(row)) sub = row;
        }
        // A table cell, when nothing above matched — see nearestTableCell.
        if (!sub) sub = nearestTableCell(target, editEntity);
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
  /** Drops a decorator onto the page currently in view.
   *
   * Placement is absolute (see editor/decorators.ts), so this can never move
   * a line of text — which is what makes a single click a safe interaction.
   * The policy from book/decorators/policy.py is surfaced as a WARNING, not a
   * veto: it is a judgement about whether art improves the page, and the
   * person looking at the page is better placed to make it than a threshold.
   */
  /** `dropAt` is a point inside the page, in the page's own coordinates —
   * supplied when the art was DRAGGED onto a spot, absent when it was simply
   * clicked, in which case the advised position in the page's free space is
   * used instead. */
  async function onPlaceDecorator(
    item: DecoratorItem,
    target?: { page: HTMLElement; dropAt?: { x: number; y: number } },
  ) {
    const d = getDoc();
    if (!d) return;
    const pageEls = pagesOf(d);
    const page =
      target?.page ??
      pageEls[Math.min(Math.max(activePage - 1, 0), pageEls.length - 1)];
    if (!page) {
      pushToast("error", "Scroll to a page first.");
      return;
    }
    setPlacingDecorator(true);
    try {
      const advice = advisePlacement(page, item);
      let at = advice.suggested ?? { left: 60, top: 60, width: item.width };
      if (target?.dropAt) {
        // Centre the art on the cursor, then keep it inside the page — the
        // page clips, so art dropped near an edge would be half invisible.
        const w = at.width;
        const h = Math.round((w / item.width) * item.height);
        at = {
          width: w,
          left: Math.round(Math.min(Math.max(target.dropAt.x - w / 2, 0), Math.max(page.offsetWidth - w, 0))),
          top: Math.round(Math.min(Math.max(target.dropAt.y - h / 2, 0), Math.max(page.offsetHeight - h, 0))),
        };
      }
      // Inlined as base64 rather than left pointing at the editor's own URL —
      // a chapter has to stay self-contained to open anywhere else.
      const dataUrl = await fetchAsDataUrl(item.url);
      const el = placeDecorator(d, page, item, dataUrl, at);
      restampAfterMutation(d);
      markDirty();
      setSelectedBlock(el);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
      if (advice.warnings.length > 0) {
        pushToast("info", advice.warnings[0]);
      } else {
        pushToast("success", `${item.name} added — drag it where you want.`);
      }
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Could not add that picture.");
    } finally {
      setPlacingDecorator(false);
    }
  }

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

  /**
   * EVERY flow container on a page, in reading order.
   *
   * `blockContainerOf` answers with the FIRST one, which is the whole story
   * only on a one-column page. This book has neither: a Part-1 or Part-2 page
   * is `.acols > .acol + .acol`, and the cover is a masthead followed by six
   * `.source-front-section`s. On those, "the page's block container" is not a
   * thing — there are several, and which one you mean depends on whether you
   * are asking where the page ENDS or where it BEGINS.
   *
   * Reflow was asking the wrong one. It took the last block of column ONE and
   * moved it to the next page, while the content that actually did not fit sat
   * at the foot of column TWO — so the page still overflowed, the cascade went
   * round again, and it would strip column one bare a block at a time while
   * column two never changed. On the cover it moved the masthead's own last
   * child. That is why text piled up past the cut line and stayed there.
   */
  function flowContainersOf(pageEl: HTMLElement): HTMLElement[] {
    const selectors = structureRef.current?.blockContainerSelectors ?? [];
    if (!selectors.length) return [pageEl];
    const found = Array.from(
      pageEl.querySelectorAll<HTMLElement>(selectors.join(",")));
    // Nested matches would double-count a container and its own parent; keep
    // only the innermost, which is what actually holds blocks.
    const innermost = found.filter(
      (c) => !found.some((other) => other !== c && c.contains(other)));
    return innermost.length ? innermost : [pageEl];
  }

  /** Where a page's content BEGINS — the head of its first column. */
  function headContainerOf(pageEl: HTMLElement): HTMLElement {
    return flowContainersOf(pageEl)[0];
  }

  /** Every flow container in the document, in reading order — column one,
   *  column two, then overleaf. The chain a block actually travels along. */
  function containerChain(doc: Document): HTMLElement[] {
    const structure = structureRef.current;
    if (!structure || structure.mode !== "paginated") {
      return structure?.root ? [structure.root] : [];
    }
    return collectPages(doc, structure).flatMap((page) => flowContainersOf(page));
  }

  /**
   * The line before or after `line` in READING ORDER — across columns and
   * pages, not just among siblings.
   *
   * Sibling-only was why "move this question down" kept answering "there is
   * nothing below it on this page". A block at the foot of column one has no
   * next sibling; what follows it in the book is the top of column two. So a
   * block moved to the head of a column could not be moved back, and one at
   * the foot could not be moved on — the two places you most want to nudge
   * something, and the only two where it refused.
   */
  function neighbourLine(line: HTMLElement, dir: -1 | 1): HTMLElement | null {
    const sib = dir === -1 ? line.previousElementSibling : line.nextElementSibling;
    if (sib) return sib as HTMLElement;
    const doc = getDoc();
    const here = line.parentElement as HTMLElement | null;
    if (!doc || !here) return null;
    const chain = containerChain(doc);
    const at = chain.indexOf(here);
    if (at < 0) return null;
    // Past the end of this container: step along the chain until one has a
    // line in it. An empty column is crossed rather than treated as a wall.
    for (let i = at + dir; i >= 0 && i < chain.length; i += dir) {
      if (!mayExchange(chain[i], here)) return null;
      const kids = chain[i].children;
      if (kids.length) {
        return (dir === -1 ? kids[kids.length - 1] : kids[0]) as HTMLElement;
      }
    }
    return null;
  }

  /** Which declared container this is — `.acol`, `.source-front-section`, … */
  function containerKind(el: HTMLElement): string | null {
    return (structureRef.current?.blockContainerSelectors ?? [])
      .find((sel) => el.matches(sel)) ?? null;
  }

  /**
   * May a block move between these two containers without changing what the
   * document says?
   *
   * TWO WAYS IT CANNOT, and this chapter has one of each on its first two
   * pages.
   *
   * Different KINDS of container. The cover's blocks live in
   * `.source-front-section`s and every other page's in `.acol`s; they are
   * different designs holding different things, and a topic dropped into a
   * cover section is not "the same content, one page earlier" — it is a
   * revision card set inside the analytics. This is what put section 2.1 at
   * the foot of the cover, ahead of the PART 1 banner that introduces it.
   *
   * Content ABOVE the columns of the LATER page. A part banner is a child of
   * the sheet, not of a column, so a block crossing that boundary would jump
   * it — the reader meets the first topic before the heading announcing it.
   *
   * THE GUARD IS ASKED OF THE LATER PAGE, whichever argument that happens to
   * be, and getting that wrong was the whole reason overflow stopped moving.
   * Written as "walk up from `from`", it was right for a pull — where `from`
   * IS the later page's first column — and wrong for a push, where `from` is
   * the EARLIER page's LAST column. A last column always has a previous
   * sibling: the column beside it. So the guard rejected every push on every
   * two-column page in the book, which is every page but the cover, and a
   * page that outgrew its sheet simply stayed that way.
   */
  function mayExchange(from: HTMLElement, to: HTMLElement): boolean {
    if (containerKind(from) !== containerKind(to)) return false;
    const fromPage = from.closest(".page");
    const toPage = to.closest(".page");
    // Within one page, adjacent columns ARE one flow — column two continues
    // column one — so nothing more to check.
    if (!fromPage || !toPage || fromPage === toPage) return true;
    const later = (fromPage.compareDocumentPosition(toPage)
                   & Node.DOCUMENT_POSITION_FOLLOWING) ? to : from;
    for (let node: HTMLElement | null = later;
         node && !node.classList.contains("page");
         node = node.parentElement) {
      if (node.previousElementSibling) return false;
    }
    return true;
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
    // AFTER makeBlocksDraggable, which sets `draggable=true` on everything it
    // stamped. Placed art needs the opposite: free x/y drag, not flow-reorder
    // drag, so it clears that flag and installs its own pointer handlers.
    // Doing it here rather than only at placement means art already in a saved
    // chapter is draggable the moment the file is opened.
    enableDecoratorDragging(doc, markDirty);
  }

  /**
   * Undo checkpointing is DEBOUNCED, because a commit is expensive.
   *
   * commitToModel sanitizes and re-parses the entire document: measured at
   * ~1.2s on a real 6.5MB chapter. That was tolerable while markDirty only
   * fired on discrete actions (a drag, a slider release), but Enter and
   * Backspace now go through it too — so every keystroke that split or
   * merged a block would freeze the editor for about a second, which makes
   * writing in a large document impossible.
   *
   * Coalescing also gives BETTER undo granularity: a burst of typing becomes
   * one checkpoint instead of one per keystroke, so Ctrl+Z steps back by a
   * sentence rather than by a character.
   *
   * Anything that reads the model rather than the DOM must call
   * flushPendingCommit() first — see undo/redo/save.
   */
  const pendingCommitRef = useRef<number | null>(null);
  const COMMIT_DEBOUNCE_MS = 400;

  function scheduleCommit() {
    if (pendingCommitRef.current !== null) window.clearTimeout(pendingCommitRef.current);
    pendingCommitRef.current = window.setTimeout(() => {
      pendingCommitRef.current = null;
      commitToModel();
      checkOverflow();
    }, COMMIT_DEBOUNCE_MS);
  }

  function flushPendingCommit() {
    if (pendingCommitRef.current === null) return;
    window.clearTimeout(pendingCommitRef.current);
    pendingCommitRef.current = null;
    commitToModel();
    checkOverflow();
  }

  // A pending checkpoint must not be lost when leaving the page.
  useEffect(() => () => {
    if (pendingCommitRef.current !== null) window.clearTimeout(pendingCommitRef.current);
  }, []);

  /** A STRUCTURAL change: checkpoint it NOW, not in 400ms.
   *
   * `markDirty` defers the commit through `scheduleCommit`, which is right
   * for typing — a checkpoint per keystroke would make Ctrl+Z useless. It is
   * wrong for a move. Two drags inside the 400ms window collapsed into a
   * SINGLE checkpoint, so one Ctrl+Z undid both of them; and a drag followed
   * within the window by a text edit put both into one checkpoint too, so
   * undoing the typing also silently moved the block back.
   *
   * That is the whole of "the layout goes random and Ctrl+Z does not fix
   * it": the history had fewer entries than the user had made gestures, so
   * undo could not land on the state they were aiming for. One gesture, one
   * checkpoint. Any pending debounced commit is flushed first so the
   * keystrokes before the move keep their own entry.
   */
  function commitNow() {
    if (previewVersionIdRef.current) return;
    setDirty(true);
    // EXACTLY ONE CHECKPOINT. Not two.
    //
    // This used to call flushPendingCommit() and then commitToModel(), which
    // is one commit too many. `commitToModel` pushes the PREVIOUS model onto
    // the history and then adopts the live DOM as the current one, so calling
    // it twice in a row pushes the post-move state as well: the history ends
    // up [..., before-the-move, after-the-move], and the top entry is the
    // state already on screen.
    //
    // Ctrl+Z then restored what was already there and appeared to do nothing
    // at all; only a SECOND press actually undid the move. Every drag left a
    // dead step in the history. Reported as "I am not able to Ctrl+Z easily".
    //
    // `flushPendingCommit` already performs one commit when a debounced one
    // is waiting, so it is either that or a fresh commit — never both.
    if (pendingCommitRef.current !== null) {
      flushPendingCommit();
      return;
    }
    commitToModel();
    checkOverflow();
  }

  function markDirty() {
    // Editing while previewing an older version is refused rather than
    // silently accepted — see previewVersionId.
    if (previewVersionIdRef.current) return;
    setDirty(true);
    scheduleCommit();
  }

  /** A page's fixed print box never grows to fit content — it clips or
   * spills silently — so every mutation re-checks each page's real
   * scrollHeight against its own (CSS-fixed) clientHeight and paints a red
   * outline directly on the live page element when it's overflowing.
   * Indexed by position rather than a stable id: live DOM `.page` elements
   * only carry `data-page-id` right after a full doc.write() from
   * serializeDocument (undo/redo, version load) — during normal editing
   * (drag, insert, page add/duplicate) the attribute is simply absent. */
  /**
   * @param reflow  Whether a page found overflowing should be settled.
   *   FALSE ON LOAD, and that is the whole point of the flag. Opening a
   *   chapter used to schedule a reflow before any edit had been made, so a
   *   file the pipeline had just packed to exactly 1413px a page was
   *   rearranged the moment it appeared — "it loaded nicely, then it
   *   overflowed". Opening a document must never change it. Detection still
   *   runs, so a page that genuinely cannot fit is outlined straight away;
   *   moving anything waits for an actual edit.
   */
  function checkOverflow({ reflow = true }: { reflow?: boolean } = {}) {
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
    if (reflow && autoReflowRef.current) scheduleReflow(overflowing);
  }

  /**
   * Reflow, debounced, after an edit settles.
   *
   * `onPushOverflow` already cascades correctly and creates pages as it goes —
   * it just never ran unless the user noticed a red outline and clicked a
   * button. A page is a fixed 1527px and `overflow:hidden`, so until it runs
   * the text that no longer fits is simply invisible. Typing a paragraph and
   * watching the rest of the page quietly disappear is not something a user
   * should have to police.
   *
   * Debounced because it moves DOM around: doing that on every keystroke
   * would fight the caret.
   */
  function scheduleReflow(overflowing: Set<number>) {
    if (reflowTimerRef.current) window.clearTimeout(reflowTimerRef.current);
    reflowTimerRef.current = window.setTimeout(() => {
      const doc = getDoc();
      if (!doc) return;
      let moved = 0;
      // Earliest page first: pushing from page 3 can resolve page 4 on its own.
      Array.from(overflowing).sort((a, b) => a - b).forEach((i) => {
        const pageEls = pagesOf(doc);
        if (pageEls[i] && isPageOverflowing(pageEls[i])) {
          onPushOverflow(i);
          moved += 1;
        }
      });
      // PUSH ONLY. Nothing is ever pulled BACKWARD automatically.
      //
      // Closing up behind an edit sounds like tidying and is not. The
      // pipeline decides where every break falls and balances the two columns
      // on each page; an editor that pulls content up re-packs that the
      // moment any reflow runs — column two drains into column one on every
      // page the packer deliberately left short, and the chapter stops
      // looking like the chapter. Which is the one thing it must never do: a
      // file is opened to correct a word, not to be re-typeset.
      //
      // So a gap left by a deletion stays a gap, and only content that no
      // longer FITS moves, because the alternative there is content nobody
      // can see. The toolbar's join puts a split box back together when the
      // space should be closed.
      if (moved) {
        checkOverflow();
        markDirty();
        pushToast("info",
          `Text reflowed onto ${moved === 1 ? "the next page" : "following pages"}.`);
      }
    }, 700);
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
      // FROM THE FOOT OF THE LAST COLUMN, TO THE HEAD OF THE FIRST — see
      // flowContainersOf. On a two-column page that is the only move that
      // both relieves the page and keeps reading order: the block that did
      // not fit is the one at the end of column two, and where it belongs
      // is the top of column one overleaf. An empty tail column is skipped
      // rather than ending the cascade, since a page can overflow while its
      // last column happens to be empty.
      const cols = flowContainersOf(page).reverse()
        .find((c) => c.lastElementChild);
      const lastBlock = cols?.lastElementChild as HTMLElement | null;
      if (!cols || !lastBlock) break;

      let nextPage = pageEls[idx + 1];
      if (!nextPage) {
        nextPage = makeBlankPageLike(page);
        page.after(nextPage);
      }
      const nextCols = headContainerOf(nextPage);
      // A cover section's block does not belong in a revision column, and a
      // column's block does not belong on the cover — see mayExchange. Left
      // ungated, the very first overflow in the book moved a cover block into
      // Part 1. The page keeps what it cannot hand on, and the red cut line
      // says so rather than the content being quietly relocated.
      if (!mayExchange(cols, nextCols)) break;
      nextCols.insertBefore(lastBlock, nextCols.firstChild);
      idx++; // keep cascading from whichever page just received the overflow, in case it now overflows too
    }
    renumberPages(doc);
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
    // The `.u` guard goes too, when it is left empty. Otherwise it still
    // occupies a line and still carries its margin guard, so cutting or
    // deleting a block left a blank gap exactly where it had been.
    removeLine(selectedBlock);
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

  /** Confirms a move and offers the way back, so a wrong drop is one click to
   * fix rather than a hunt for Ctrl+Z. */
  function noteMoved() {
    pushToast("success", "Moved — press Ctrl+Z to put it back.");
  }

  function onMoveBlockToPage(pageIndex: number) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const pageEls = pagesOf(doc);
    const targetCols = pageEls[pageIndex] ? blockContainerOf(pageEls[pageIndex]) : null;
    if (!targetCols) return;
    targetCols.appendChild(selectedBlock);
    commitNow();
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
  /**
   * Bold/italic/underline, and what happens when the selection is a formula.
   *
   * These go through `execCommand`, which rewrites the markup it spans — and
   * a formula IS markup, so applying one to maths used to leave the formula
   * rendering as ordinary text. It is refused now (see selectionTouchesMath)
   * and the refusal says what to use instead, because "make this result
   * stand out" is a real thing to want.
   */
  function applyInline(tag: "bold" | "italic" | "underline") {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    if (toggleInlineTag(doc, tag)) {
      markDirty();
      return;
    }
    const target = mathTargetOf(doc.getSelection()?.anchorNode?.parentElement ?? null);
    if (target) {
      pushToast("info",
        `${tag[0].toUpperCase() + tag.slice(1)} would rebuild the formula and flatten it. ` +
        `Use ✨ Emphasise formula (Ctrl+Shift+H) to box and bold it instead.`,
        { action: { label: "Emphasise it", run: () => onEmphasiseMath() } });
    }
  }

  /** Rings the formula under the caret in a gold box and bolds it —
   *  additive, so the formula's own structure is never touched. */
  function onEmphasiseMath() {
    const doc = getDoc();
    if (!doc) return;
    const sel = doc.getSelection();
    const from = (sel?.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? (sel!.anchorNode as Element)
      : sel?.anchorNode?.parentElement) ?? selectedSubPart ?? selectedBlock;
    const target = mathTargetOf(from ?? null);
    if (!target) {
      pushToast("info", "Put the caret in a formula first, then emphasise it.");
      return;
    }
    const on = toggleMathEmphasis(target);
    markDirty();
    pushToast("success", on ? "Formula emphasised." : "Emphasis removed.");
  }

  /** Inserts a Greek letter, operator or mark at the live caret — works
   *  equally with a selection (replaces it) or a bare caret (inserts
   *  there), so this is reachable the moment a click places a cursor, not
   *  only once something is highlighted. */
  function onInsertSymbol(symbol: string) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    if (!insertAtCaret(doc, symbol)) {
      pushToast("info", "Click into some text first, then insert a symbol.");
      return;
    }
    markDirty();
  }

  /** Marks the selection — or a one-letter placeholder at a bare caret —
   *  as a vector: `<span class="vec">…</span>`, the exact shape the
   *  pipeline itself builds from `letter + \vec` in the source markdown,
   *  arrow drawn by the chapter's own CSS. */
  function onInsertVector() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    if (!wrapSelectionAsVector(doc)) {
      pushToast("info", "Click into some text first, then mark it as a vector.");
      return;
    }
    markDirty();
  }

  function onTextBold() {
    applyInline("bold");
  }
  function onTextItalic() {
    applyInline("italic");
  }
  function onTextUnderline() {
    applyInline("underline");
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
    if (!clearSelectionFormatting(doc, selectedBlock)) {
      pushToast("info",
        "That selection contains a formula — clearing formatting would strip "
        + "the parts it is built from. Select the words either side instead.");
      return;
    }
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
    // Art is resized by width alone; `height:auto` keeps its proportions, so
    // a corner drag scales it without ever fighting its aspect ratio.
    if (selectedBlock?.classList.contains(DECOR_CLASS)) {
      resizeDecorator(selectedBlock, widthPx);
      return;
    }
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
    // For art the corner handles scale proportionally via `height:auto`; the
    // bottom edge handle is the deliberate override, so it writes a real
    // height. Without this the handle was simply dead on a decorator.
    if (selectedBlock?.classList.contains(DECOR_CLASS)) {
      selectedBlock.style.height = `${Math.max(24, Math.round(heightPx))}px`;
      return;
    }
    if (!selectedSubPart) return;
    // ONTO THE PICTURE, NOT THE BOX AROUND IT.
    //
    // `object-fit` only means anything on a replaced element — an <img>. A
    // figure holding a real photograph is `.figure-image > img`, and the
    // image REGION is the div, so this wrote a height and an inert
    // `object-fit:cover` onto the div: the div changed shape, the picture
    // inside kept its own `height:auto`, and the result was a small image
    // adrift in a large empty box. (A chapter with no art yet has no <img>
    // at all — there the region IS the plate, and sizing it is right.)
    const picture = selectedSubPart.tagName === "IMG"
      ? selectedSubPart
      : selectedSubPart.querySelector<HTMLElement>("img") ?? selectedSubPart;
    picture.style.height = `${heightPx}px`;
    picture.style.objectFit = "cover";
    // The box follows the picture rather than holding its old height under
    // it — otherwise shrinking the photo leaves the gap it used to fill,
    // which reads as the resize having half-worked.
    if (picture !== selectedSubPart) selectedSubPart.style.height = "auto";
  }


  /** A readable name for a block, for confirming what just happened. */
  function describeBlock(el: HTMLElement): string {
    return registryEntryFor(el).entry.label ?? "Block";
  }


  /** Copy the selected block's markup to the editor's own clipboard.
   *  Named functions rather than inline in the keydown switch so the SAME
   *  action is reachable from a visible toolbar button — Ctrl+C/X/V worked
   *  from day one and were entirely keyboard-only, with nothing on screen
   *  to say they existed. */
  function onCopyBlock() {
    if (!selectedBlock) return;
    blockClipboardRef.current = selectedBlock.outerHTML;
    setClipboardHasBlock(true);
    pushToast("success", "Block copied");
  }

  function onCutBlock() {
    if (!selectedBlock) return;
    blockClipboardRef.current = selectedBlock.outerHTML;
    setClipboardHasBlock(true);
    const what = describeBlock(selectedBlock);
    onRemoveBlock();
    // Cutting used to remove the block in silence. Moving something a long
    // way — a formula half from the foot of one page to the top of another
    // — is far easier as cut-and-paste than as a drag, but only if you can
    // tell it worked.
    pushToast("success", `${what} cut — select where it should go and paste.`);
  }

  function onPasteBlock() {
    if (!blockClipboardRef.current) return;
    onInsertBlock(blockClipboardRef.current);
  }

  /** Deletes just the repeated row that is selected, if one is.
   *
   * Returns false when the selection is not inside a row, so the caller falls
   * back to deleting the whole block. */
  function deleteSelectedItem(): boolean {
    const sel = selectedSubPart ?? selectedBlock;
    if (!sel) return false;
    const item = sel.closest<HTMLElement>("[data-nested-item]");
    if (!item) return false;
    const group = itemGroupFor(item);
    if (!group || !removeItem(group, item)) return false;
    const d = getDoc();
    if (d) restampAfterMutation(d);
    setSelectedSubPart(null);
    markDirty();
    pushToast("success", `${group.noun} removed`);
    return true;
  }

  /** Drops the standing "new" marker. One block at a time carries it. */
  function clearFreshBlock(doc: Document | null) {
    doc?.querySelectorAll(`.${ED.freshBlock}`)
      .forEach((el) => el.classList.remove(ED.freshBlock));
    freshBlockRef.current = null;
  }

  function onInsertBlock(snippetHtml: string) {
    const doc = getDoc();
    if (!doc) return;
    // Insert next to whatever's selected; with nothing selected, fall back to
    // the first page's block container, or (flow mode) the content root.
    // With nothing selected, the block goes to the page in view — NOT page 1.
    // On a 73-page chapter "the top of page 1" is nowhere near what the user
    // is looking at, so the insert appeared to do nothing and the block was
    // effectively lost.
    const pageEls = pagesOf(doc);
    const viewedPage = pageEls[Math.min(Math.max(activePage - 1, 0), pageEls.length - 1)];
    // The LINE container — the column — not the selected block's own `.u`
    // guard, which `parentElement` returns and which is not somewhere another
    // block may live. Pasting into it put two blocks in one line unit, and
    // from then on the two moved as one.
    const targetCols =
      (selectedBlock ? lineParentOf(selectedBlock) : null) ??
      (viewedPage ? blockContainerOf(viewedPage) : structureRef.current?.root ?? null);
    if (!targetCols) return;
    const fragment = doc.createRange().createContextualFragment(snippetHtml);
    const inserted = fragment.firstElementChild as HTMLElement | null;
    if (selectedBlock && inserted) {
      insertLineAfter(selectedBlock, inserted);
    } else if (inserted) {
      appendLine(targetCols, inserted);
    }
    if (inserted) {
      restampAfterMutation(doc);
      setSelectedBlock(inserted);
      setSelectedSubPart(null);
      setSelectedSubBlock(null);
      // Scroll to it. With nothing selected the insert lands at the top of
      // page 1, which on a 69-page chapter is usually nowhere near what the
      // user is looking at — so the palette appeared to do nothing at all.
      scrollToElement(inserted);
      // Flash it. Scrolling to a block that looks like all the others still
      // leaves "where did it go?" — a moment of highlight answers that.
      inserted.classList.add(ED.justAdded);
      window.setTimeout(() => inserted.classList.remove(ED.justAdded), 1400);
      // The flash is over in 1.4s; "which box did I just add?" is not. Only
      // one block is ever the fresh one, so any previous marker is cleared
      // first — otherwise inserting five boxes leaves five "new" badges and
      // the marker stops meaning anything.
      clearFreshBlock(doc);
      inserted.classList.add(ED.freshBlock);
      freshBlockRef.current = inserted;
      // FLOAT IT, rather than pushing the page down around it.
      //
      // Inserting into the flow is right for the document and wrong for the
      // moment of insertion: everything below the insertion point shifts down
      // and the new block ends up off the bottom of what you were reading. A
      // picture does not behave that way — it appears ON the page you are
      // looking at, over the content, and you move it before it settles. This
      // gives a new block the same treatment. See placeFreshlyInserted.
      const pageNo = currentPageIndexOf(inserted, doc) + 1;
      const floated = placeFreshlyInserted(doc, inserted);
      if (floated) {
        setChromeClass(inserted, ED.placedFree, true);
        pushToast("success",
          `${describeBlock(inserted)} placed on page ${pageNo} — drag it where you want it, then press Enter to fit it into the text.`);
      } else {
        pushToast("success",
          `${describeBlock(inserted)} added ${insertDestinationRef.current} — page ${pageNo}`);
      }
    }
    markDirty();
  }

  /**
   * Writes the chapter to a real file on disk.
   *
   * This was an `<a href={exportUrl(...)}>`, and `exportUrl` returns "#" —
   * there is no server to export from any more, so the button did nothing at
   * all. It does not need one: the bytes are already here. What it must NOT
   * do is hand over the live DOM, which carries the editor's own scaffolding
   * (block ids, `__ed-*` classes, the injected chrome stylesheet) — so it
   * goes through serializeForSave, exactly as saving a version does, and the
   * file that lands is the book and nothing else.
   */
  function onDownloadHtml() {
    const doc = getDoc();
    if (!doc) return;
    flushPendingCommit();
    const blob = new Blob([serializeForSave(doc)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bookId || "chapter"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked on the next tick, not immediately: revoking synchronously can
    // beat the browser to reading the blob and the download silently fails.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    pushToast("success", `Downloaded ${a.download}`);
  }

  async function onSave(force = false) {
    const doc = getDoc();
    if (!doc || !bookId) return;
    if (previewVersionIdRef.current) {
      pushToast("info", "You're previewing an older version — restore it first to make changes.");
      return;
    }
    flushPendingCommit();
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
    flushPendingCommit();
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
    // Every caller of this adds, duplicates or deletes a page, so the printed
    // footers are stale by definition once fn has run.
    renumberPages(doc);
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
  /**
   * An empty page built like the one it follows — ALL of its scaffolding.
   *
   * This used to shallow-clone the page and hang a single shallow-cloned
   * `.acol` straight off it. Everything between the two was dropped, and
   * everything between the two is what makes a page a page: the new sheet
   * came out as `.page > .acol`, with no `.sheet-body` to give it its fixed
   * content box, no `.acols` flex row, ONE column instead of two, and no
   * footer. A single full-width column of text — which is exactly what "the
   * columnar pattern is lost" looks like, and it appeared the first time an
   * edit overflowed far enough to need a new page.
   *
   * Cloning the whole page and emptying its containers keeps every wrapper
   * without needing to know what any of them are called.
   */
  function makeBlankPageLike(model: HTMLElement): HTMLElement {
    const blank = model.cloneNode(true) as HTMLElement;
    blank.removeAttribute("data-page-id");
    const containers = flowContainersOf(blank);
    containers.forEach((c) => {
      c.replaceChildren();
      c.removeAttribute("data-block-id");
    });
    blank.querySelectorAll("[data-block-id]").forEach((el) => el.removeAttribute("data-block-id"));

    // Anything the model carried ABOVE its columns is an announcement, not
    // content: a part banner says "PART 1 · QUICK REVISION" once, and a page
    // created by overflow halfway through Part 1 must not say it again.
    const first = containers[0];
    if (first) {
      for (let node: HTMLElement | null = first;
           node && !node.classList.contains("page");
           node = node.parentElement) {
        while (node.previousElementSibling) node.previousElementSibling.remove();
      }
    }
    return blank;
  }

  /** Renumbers the printed page footers after pages are added or removed.
   *  Two sheets both saying "7" is the kind of wrong a reader notices before
   *  anything else on the page. */
  function renumberPages(doc: Document) {
    pagesOf(doc).forEach((page, i) => {
      const n = page.querySelector(".page-number");
      if (n) n.textContent = String(i + 1);
      if (page.dataset.page) page.dataset.page = String(i + 1);
    });
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

  /* ---- Hooks MUST all appear above the early return below. React counts
     them per render, so one placed after it never runs on the first pass
     (when `book` is still null) and then does once the book loads — a
     different count, which throws and unmounts the tree. The symptom is a
     completely blank editor, which says nothing about the cause. See the
     guard in hookOrder.test.ts. ---- */

  /** Where an inserted block will land, said in words.
   *
   * The insert goes after the selected block, or — with nothing selected — at
   * the top of page 1, which on a 73-page chapter is nowhere near what the
   * user is looking at. That fallback is worth flagging rather than letting
   * the block vanish somewhere off-screen. */
  const insertDestination = useMemo(() => {
    if (selectedBlock) {
      const label = registryEntryFor(selectedBlock).entry.label ?? "block";
      const d = getDoc();
      const idx = d ? currentPageIndexOf(selectedBlock, d) : -1;
      return {
        text: `after this ${label.toLowerCase()}${idx >= 0 ? ` on page ${idx + 1}` : ""}`,
        fallback: false,
      };
    }
    return { text: `at the end of page ${activePage}`, fallback: true };
  }, [selectedBlock, docModel, activePage, getDoc]);
  /** The chapter's own stylesheet, so a palette preview looks like the block
   * it will actually insert. Read once per document rather than per hover —
   * a chapter's inlined CSS runs to megabytes. */
  const previewCss = useMemo(() => {
    const d = getDoc();
    if (!d) return "";
    return Array.from(d.querySelectorAll("style"))
      .map((n) => n.textContent ?? "")
      .join("\n");
  }, [docModel, getDoc]);

  const insertDestinationRef = useRef(insertDestination.text);
  useEffect(() => { insertDestinationRef.current = insertDestination.text; }, [insertDestination]);

  // Recomputed whenever the overflow scan runs, which is after every mutation.
  const pageFullness = useMemo(() => {
    const d = getDoc();
    if (!d || structure?.mode !== "paginated") return [];
    return pagesOf(d).map((p) => {
      const limit = p.clientHeight || 1;
      return p.scrollHeight / limit;
    });
  }, [structure, overflowPageIndices, docModel, getDoc]);

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
  // True for an ordinary text SELECTION; false for a bare caret with
  // nothing highlighted. Bold/italic/colour/clear need a selection to act
  // on and are hidden without one — but a symbol or a vector inserts at a
  // caret exactly as typing would, so THAT part of the toolbar stays.
  // Without this, the entire toolbar vanished the instant a click merely
  // placed a caret rather than dragged out a selection, which is most
  // clicks — "click empty space and cursor comes" had nowhere to insert
  // anything once it did.
  let textToolbarIsCollapsed = false;
  if (doc && iframeEl && selectedBlock) {
    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0 && sel.anchorNode &&
        selectedBlock.contains(sel.anchorNode) &&
        (sel.anchorNode as HTMLElement).isContentEditable !== false &&
        doc.activeElement && selectedBlock.contains(doc.activeElement)) {
      const range = sel.getRangeAt(0);
      const r = range.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        textToolbarRect = toOuterRect(iframeEl, r, canvasScale);
        textToolbarIsCollapsed = sel.isCollapsed;
      } else if (sel.isCollapsed) {
        // A collapsed range at the very start/end of a line, or in an empty
        // element, reports a zero-size rect — fall back to the containing
        // editable element's own box so the toolbar still has somewhere to
        // anchor rather than not appearing at all.
        const host = (sel.anchorNode.nodeType === Node.ELEMENT_NODE
          ? sel.anchorNode as Element : sel.anchorNode.parentElement);
        const hr = host?.getBoundingClientRect();
        if (hr && (hr.width > 0 || hr.height > 0)) {
          textToolbarRect = toOuterRect(iframeEl, hr, canvasScale);
          textToolbarIsCollapsed = true;
        }
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
  // Placed art is selected as the BLOCK, not as an image sub-part, so it
  // needs its own branch to get the same corner handles a figure image gets.
  const decoratorSelected = !!(
    selectedBlock && selectedBlock.classList.contains(DECOR_CLASS) && singleSelected
  );
  const handleTarget = decoratorSelected ? selectedBlock : selectedSubPart;
  if (doc && iframeEl && handleTarget && (decoratorSelected || (selectedSubPart && imageSubPartActive)) && singleSelected) {
    const r = handleTarget.getBoundingClientRect();
    imageHandlesRect = toOuterRect(iframeEl, r, canvasScale);
    imageAspect = r.width && r.height ? r.width / r.height : 1;
  }

  // Context for the on-canvas toolbar. Computed here so the toolbar itself
  // stays a dumb renderer and every action keeps going through the same
  // mutation helpers the panel uses.
  const toolbarItemGroup = selectedBlock
    ? itemGroupFor((selectedSubPart ?? selectedBlock) as HTMLElement)
    : null;
  /** The row inside the selected block that the up/down buttons act on —
   *  whatever is selected, resolved to the nested item containing it. */
  const toolbarItem =
    (selectedSubBlock ?? selectedSubPart)?.closest<HTMLElement>("[data-nested-item]") ?? null;
  const toolbarItemIndex = toolbarItem && toolbarItemGroup
    ? toolbarItemGroup.items.indexOf(toolbarItem)
    : -1;

  /** Swaps the selected row with its neighbour of the same shape. Moving by
   *  SIBLING rather than by index keeps a row among its own kind: the rows
   *  of a box are not always its only children, and stepping over a divider
   *  or a heading would put a formula somewhere it cannot be. */
  function onMoveItem(delta: -1 | 1) {
    const doc = getDoc();
    if (!doc || !toolbarItem || !toolbarItemGroup || toolbarItemIndex < 0) return;
    const neighbour = toolbarItemGroup.items[toolbarItemIndex + delta];
    if (!neighbour) return;
    if (delta === -1) neighbour.before(toolbarItem);
    else neighbour.after(toolbarItem);
    restampAfterMutation(doc);
    markDirty();
    toolbarItem.scrollIntoView?.({ block: "nearest" });
    pushToast("success",
      `${toolbarItemGroup.noun} moved ${delta === -1 ? "up" : "down"}`);
  }

  /** Breaks the selected row and everything under it out into a box of its
   *  own, placed on the next line so the page can break between the two. */
  function onSplitItems() {
    const doc = getDoc();
    if (!doc || !selectedBlock || !toolbarItem || !toolbarItemGroup) return;
    const half = splitItemGroup(toolbarItemGroup, toolbarItem);
    if (!half) return;
    insertLineAfter(selectedBlock, half);
    restampAfterMutation(doc);
    setSelectedBlock(half);
    setSelectedSubPart(null);
    setSelectedSubBlock(null);
    markDirty();
    half.scrollIntoView?.({ block: "nearest" });
    pushToast("success",
      `Split into two — drag either half where you want it.`);
  }

  /**
   * Nudges the selected block one place along the reading order.
   *
   * A QUESTION MOVES WHOLE. `questionRun` already knows that a question is a
   * run of sibling units — head, tags, stem, options, answer — and the side
   * panel could already move one. What it could not do was cross a column:
   * it asked for a previous/next SIBLING, so at the head or the foot of a
   * column it answered "there is nothing above it on this page" and stopped.
   * neighbourLine walks the real chain instead, so up and down always mean
   * something, and anything moved up can be moved straight back down.
   */
  function onStepBlock(dir: -1 | 1) {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const run = questionRun(selectedBlock);
    const line = lineOf(selectedBlock);
    const edge = run.length > 1
      ? (dir === -1 ? run[0] : run[run.length - 1])
      : line;
    const other = neighbourLine(edge, dir);
    if (!other) {
      pushToast("info", `There is nothing ${dir === -1 ? "above" : "below"} this to move past.`);
      return;
    }
    if (run.length > 1) {
      moveRun(run, other, dir === -1);
    } else if (dir === -1) {
      other.before(line);
    } else {
      other.after(line);
    }
    renumberPages(doc);
    restampAfterMutation(doc);
    markDirty();
    selectedBlock.scrollIntoView?.({ block: "nearest" });
    pushToast("success",
      `${run.length > 1 ? describeRun(run) : describeBlock(selectedBlock)} moved ${dir === -1 ? "up" : "down"}`);
  }

  /** The box immediately after this one, when it is the same KIND of box —
   *  the other half of a split, and the only thing it makes sense to join. */
  function joinCandidate(block: HTMLElement | null): HTMLElement | null {
    if (!block) return null;
    const next = lineOf(block).nextElementSibling as HTMLElement | null;
    const other = next?.classList.contains("u")
      ? (next.firstElementChild as HTMLElement | null)
      : next;
    if (!other || other.className !== block.className) return null;
    return other;
  }

  /** Puts a split box back together — the inverse of onSplitItems, so a
   *  split made to fit a column can be undone once there is room again. */
  function onJoinItems() {
    const doc = getDoc();
    if (!doc || !selectedBlock) return;
    const other = joinCandidate(selectedBlock);
    if (!other) return;
    while (other.firstChild) selectedBlock.appendChild(other.firstChild);
    removeLine(other);
    restampAfterMutation(doc);
    markDirty();
    pushToast("success", "Joined back into one box.");
  }

  /** The formula the caret is in, if any — decides whether the text toolbar
   *  offers ✨ formula at all. Read live from the canvas rather than held in
   *  state: the caret moves without React re-rendering. */
  const caretMathTarget = (() => {
    const d = iframeRef.current?.contentDocument;
    const node = d?.getSelection()?.anchorNode ?? null;
    const from = node?.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node?.parentElement ?? null;
    return mathTargetOf(from);
  })();

  const toolbarIsPicture = !!selectedBlock?.classList.contains(DECOR_CLASS);
  const toolbarFloats = selectedBlock
    ? registryEntryFor(selectedBlock).entry.floats ?? []
    : [];


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
    // `book-editor-root` carries the editor's palette — every panel below is
    // written against those variables. Scoped here rather than on `:root`
    // so it cannot restyle the rest of the dashboard; see editor-theme.css.
    <div
      className="book-editor-root"
      // `100svh`, not `100vh`: on a browser with a retracting toolbar the two
      // differ by the toolbar's height, and the taller one puts the canvas's
      // foot under the chrome — where the horizontal scrollbar and the last
      // rows of the page rail live.
      style={{ display: "grid", gridTemplateRows: "56px 1fr", height: "100svh" }}
    >
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
        <button
          className="btn"
          onClick={() => setAutoReflow((v) => !v)}
          title={autoReflow
            ? "Text moves onto the next page automatically when a page fills"
            : "Pages are left alone — text that overflows stays hidden until you push it"}
          style={autoReflow ? undefined : { opacity: 0.6 }}
        >
          {autoReflow ? "↻ Reflow on" : "↻ Reflow off"}
        </button>
        <button className="btn" onClick={() => setShowHistory((s) => !s)}>History</button>
        <button className="btn" onClick={onDownloadHtml} title="Download this chapter as an HTML file">
          Download HTML
        </button>
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
            fullness={pageFullness}
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

        {/* WHY THE SIDE PANEL IS NOT HERE.
            It is hidden whenever more than one block is selected — its
            controls all describe ONE block. But nothing said so, so a
            multi-selection left behind after a bulk drag looked exactly like
            the panel being broken: you click a block, and no panel appears.
            Reported as "main issue side block is not coming". */}
        {selectedBlock && multiSelectedIds.size > 1 && (
          <div style={{
            position: "fixed", top: 68, right: 16, width: 280,
            background: "var(--shell-850)", border: "1px solid var(--shell-700)",
            borderRadius: 12, padding: "16px 18px", zIndex: 45,
            boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 8,
            }}>
              {multiSelectedIds.size} blocks selected
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-300)", lineHeight: 1.5 }}>
              Drag any one of them to move all {multiSelectedIds.size} together.
              The properties panel edits a single block, so it is hidden while
              more than one is picked.
            </div>
            <button
              onClick={() => {
                setMultiSelectedIds(new Set());
                setSelectedSubPart(null);
                setSelectedSubBlock(null);
              }}
              style={{
                marginTop: 12, width: "100%", padding: "9px 11px",
                background: "var(--shell-800)", border: "1px solid var(--shell-700)",
                borderRadius: 6, color: "var(--ink-200)", fontSize: 12.5,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              Edit just this one
            </button>
          </div>
        )}

        {singleSelected && (
          <PropertyPanel
            doc={doc}
            block={propertyEntity}
            subPart={selectedSubPart}
            onNote={(m) => pushToast("info", m)}
            capabilities={capabilities}
            onRemoveBlock={onRemoveBlock}
            onChanged={markDirty}
            onImageReplaced={(newEl) => {
              setSelectedSubPart(newEl);
              markDirty();
            }}
            anchorRect={panelAnchorRect}
            // The right edge of the PAGE, not of the window and not of the
            // selected block — see floatingPanelStyle.
            canvasRight={iframeEl ? iframeEl.getBoundingClientRect().right : null}
          />
        )}

        {textToolbarRect && singleSelected && (
          <FloatingTextToolbar
            rect={textToolbarRect}
            collapsed={textToolbarIsCollapsed}
            onInsertSymbol={onInsertSymbol}
            onInsertVector={onInsertVector}
            existingHref={existingLinkHref}
            linkEditorOpen={linkEditorOpen}
            onLinkEditorOpenChange={setLinkEditorOpen}
            onApplyLink={onApplyLink}
            onRemoveLink={onRemoveLink}
            onBold={onTextBold}
            onEmphasiseMath={caretMathTarget ? onEmphasiseMath : undefined}
            mathEmphasised={!!caretMathTarget?.classList.contains(MATH_EMPHASIS_CLASS)}
            onMath={() => {
              const d = getDoc();
              if (!d) return;
              if (applyMathToSelection(d)) {
                markDirty();
              } else {
                pushToast("info",
                          "Select maths to format it — P/Q, v_d, or LaTeX like \\frac{a}{b}.");
              }
            }}
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
            onCopy={onCopyBlock}
            onCut={onCutBlock}
            onPaste={onPasteBlock}
            hasClipboard={clipboardHasBlock}
            itemNoun={toolbarItemGroup?.noun ?? null}
            canMoveItemUp={toolbarItemIndex > 0}
            canMoveItemDown={
              toolbarItemIndex >= 0 &&
              toolbarItemIndex < (toolbarItemGroup?.items.length ?? 0) - 1
            }
            onMoveItem={toolbarItemIndex >= 0 ? onMoveItem : undefined}
            onSplitItems={toolbarItemIndex > 0 ? onSplitItems : undefined}
            onJoinItems={joinCandidate(selectedBlock) ? onJoinItems : undefined}
            onStepBlock={toolbarItemIndex < 0 ? onStepBlock : undefined}
            onAddItem={
              toolbarItemGroup
                ? () => {
                    const created = addItem(
                      toolbarItemGroup,
                      selectedSubPart?.closest<HTMLElement>("[data-nested-item]") ?? null,
                    );
                    const d = getDoc();
                    if (d) restampAfterMutation(d);
                    markDirty();
                    const slot = firstTextSlot(created);
                    if (!selectedBlock.isContentEditable) setContentEditable(slot, true);
                    slot.scrollIntoView?.({ block: "nearest" });
                    pushToast("success", `${toolbarItemGroup.noun} added`);
                  }
                : undefined
            }
            isPicture={toolbarIsPicture}
            onResizePicture={
              toolbarIsPicture
                ? (delta) => {
                    const w = parseFloat(selectedBlock.style.width)
                      || selectedBlock.getBoundingClientRect().width;
                    resizeDecorator(selectedBlock, w + delta);
                    markDirty();
                  }
                : undefined
            }
            isFreeBlock={isFree(selectedBlock)}
            onToggleFree={() => {
              if (isFree(selectedBlock)) {
                returnToFlow(selectedBlock);
                pushToast("info", "Back in the text.");
              } else {
                const d = getDoc();
                if (!d || !liftToPage(d, selectedBlock)) {
                  pushToast("error", "This block cannot be lifted — no page behind it.");
                  return;
                }
                const hit = overlappingFlow(selectedBlock);
                pushToast(hit.length ? "info" : "success",
                  hit.length
                    ? `Lifted — covering ${hit.length} block(s). Drag it clear if that is not wanted.`
                    : "Lifted onto the page. Drag its edge to move it.");
              }
              const d = getDoc();
              if (d) restampAfterMutation(d);
              markDirty();
            }}
            canWrap={toolbarFloats.length > 0}
            wrapping={toolbarFloats.some((f) => selectedBlock.classList.contains(f.class))}
            onToggleWrap={
              toolbarFloats.length > 0
                ? () => {
                    const on = toolbarFloats.some((f) => selectedBlock.classList.contains(f.class));
                    toolbarFloats.forEach((f) => selectedBlock.classList.remove(f.class));
                    // Off -> the first variant the stylesheet defines (text on
                    // the right of a left-floated picture), which is the one
                    // people mean by "wrap".
                    if (!on) selectedBlock.classList.add(toolbarFloats[0].class);
                    markDirty();
                  }
                : undefined
            }
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

        {showDecorators && (
          <div
            aria-label="Art library"
            style={{
              position: "absolute", right: 24, bottom: 82, width: 316,
              height: "min(70vh, 620px)", background: "var(--shell-850)",
              border: "1px solid var(--shell-700)", borderRadius: 10,
              boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)", zIndex: 20,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px 0",
            }}>
              <b style={{ fontSize: 12.5, color: "var(--ink-100)" }}>Art library</b>
              <button
                onClick={() => setShowDecorators(false)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--ink-400, #8a90a0)", fontSize: 16, lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <DecoratorPanel
              onPlace={onPlaceDecorator}
              onDragItem={(item) => { draggedDecoratorRef.current = item; }}
              busy={placingDecorator}
              pageLabel={pageCount > 0 ? `page ${activePage}` : null}
            />
          </div>
        )}

        {showInsert && (
          <InsertBlockPalette
            discovered={discoveredTemplates}
            onInsert={onInsertBlock}
            onClose={() => setShowInsert(false)}
            destination={insertDestination.text}
            isFallback={insertDestination.fallback}
            previewCss={previewCss}
          />
        )}

        <button
          className="btn"
          onClick={() => {
            setShowDecorators((v) => !v);
            setShowInsert(false);
          }}
          style={{
            position: "fixed",
            right: 78,
            bottom: 30,
            height: 46,
            borderRadius: 23,
            fontSize: 13,
            padding: "0 16px",
          }}
          title="Art library — students, teachers, science, classroom"
        >
          🎨 Art
        </button>

        <button
          className="btn primary"
          onClick={() => {
            setShowInsert((s) => !s);
            setShowDecorators(false);
          }}
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
