/**
 * Drag-to-move mechanics for top-level blocks, including across columns
 * and pages — a block is just a normal DOM node, so moving it via
 * insertBefore/appendChild is a real, structurally-safe move (the exact
 * same markup relocates, nothing is regenerated or re-serialized), not a
 * delete+recreate that could corrupt or lose part of the block's HTML.
 *
 * Uses native HTML5 drag-and-drop, entirely within the iframe's own
 * document — source and drop target are always the same document, so
 * there's no cross-frame drag complexity to deal with.
 */

const DRAG_MIME = "application/x-block-id";

export function makeBlocksDraggable(doc: Document) {
  doc.querySelectorAll<HTMLElement>("[data-block-id]").forEach((el) => {
    el.draggable = true;
    el.style.cursor = "grab";
  });
}

/** Dims the actual dragged element for the duration of the gesture — the
 * ONLY visual feedback previously was the drop-target indicator line;
 * the thing you'd actually grabbed gave no sign it was being moved at
 * all, which read as unresponsive/unclear rather than an active drag.
 * The opacity change is deferred a tick so the browser's native drag-ghost
 * snapshot (taken synchronously at dragstart) still shows the element at
 * full opacity — changing it immediately would make the ghost itself look
 * dim while dragging, which looks like a rendering glitch. */
function dimWhileDragging(el: HTMLElement) {
  el.style.cursor = "grabbing";
  setTimeout(() => {
    el.style.opacity = "0.35";
  }, 0);
}
function undim(el: HTMLElement | null) {
  if (!el) return;
  el.style.opacity = "";
  el.style.cursor = "grab";
}

/** A thin, glowing line inserted into the DOM to show where a dropped
 * block will land — a real sibling element you can see, not just a
 * CSS-only hover state, so the insertion point is unambiguous even when
 * dragging across a page/column boundary. */
function ensureDropIndicator(doc: Document): HTMLElement {
  let el = doc.getElementById("__drop_indicator__");
  if (!el) {
    el = doc.createElement("div");
    el.id = "__drop_indicator__";
    el.style.height = "4px";
    el.style.background = "#6c8bff";
    el.style.borderRadius = "3px";
    el.style.margin = "5px 0";
    el.style.boxShadow = "0 0 0 3px rgba(108,139,255,0.25), 0 0 10px 1px rgba(108,139,255,0.6)";
    el.style.pointerEvents = "none";
  }
  return el;
}

/**
 * Fine-grained reordering WITHIN a container that is itself a single block
 * (one data-block-id) — an individual `<figure>` inside a `.figure-grid`
 * pair, or an individual `<li>` inside a `.bullet-list`/numbered list.
 * These elements have no data-block-id of their own (only their parent
 * block does), so the top-level makeBlocksDraggable/attachDragReorder
 * mechanism can't address them individually — without this, dragging
 * anywhere inside a figure pair or a list always moved/reordered the
 * WHOLE pair or WHOLE list, never just the one image or one line the user
 * actually grabbed.
 *
 * MUST be wired up (both make*Draggable and attach*Reorder) BEFORE
 * makeBlocksDraggable/attachDragReorder in onIframeLoad: listeners for the
 * same event type on the same target fire in registration order, and
 * these call stopPropagation() once they've handled a drag that started
 * inside one of their items — registering first is what lets that actually
 * stop the top-level handler (registered after) from also reacting to the
 * same event and moving the whole parent block instead.
 */
const ITEM_SELECTOR = ".figure-grid > .figure, .bullet-list__items > li, .list--number > li";

export function makeNestedItemsDraggable(doc: Document) {
  doc.querySelectorAll<HTMLElement>(ITEM_SELECTOR).forEach((el) => {
    el.draggable = true;
    el.style.cursor = "grab";
  });
}

function ensureNestedDropIndicator(doc: Document, horizontal: boolean): HTMLElement {
  let el = doc.getElementById("__nested_drop_indicator__");
  if (!el) {
    el = doc.createElement("div");
    el.id = "__nested_drop_indicator__";
    el.style.background = "#3ec27f";
    el.style.borderRadius = "3px";
    el.style.pointerEvents = "none";
    el.style.flexShrink = "0";
  }
  if (horizontal) {
    el.style.width = "4px";
    el.style.height = "auto";
    el.style.alignSelf = "stretch";
    el.style.margin = "0 5px";
    el.style.boxShadow = "0 0 0 3px rgba(62,194,127,0.25), 0 0 10px 1px rgba(62,194,127,0.6)";
  } else {
    el.style.height = "4px";
    el.style.width = "auto";
    el.style.margin = "5px 0";
    el.style.boxShadow = "0 0 0 3px rgba(62,194,127,0.25), 0 0 10px 1px rgba(62,194,127,0.6)";
  }
  return el;
}

export function attachNestedItemReorder(doc: Document, onMoved: () => void) {
  let draggedEl: HTMLElement | null = null;
  let suspendedEditableHost: HTMLElement | null = null;

  // A bullet/numbered list's directText block becomes contenteditable="true"
  // on the WHOLE block the moment it's selected — and a native HTML5
  // dragstart on an element that lives inside a contenteditable ancestor is
  // notoriously unreliable across browsers (Chrome in particular prioritizes
  // starting a TEXT SELECTION drag over honoring that child element's own
  // `draggable="true"`), so a mousedown on an <li> there was never reliably
  // producing a real element dragstart at all — the browser's native
  // text-drag took over instead, which then falls through to acting on the
  // whole editable block. Temporarily turning contenteditable off for the
  // duration of the gesture (grab through drop/cancel) sidesteps that
  // entirely; it's restored immediately after regardless of outcome.
  doc.addEventListener("mousedown", (e) => {
    const item = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (!item) return;
    const editableHost = item.closest<HTMLElement>('[contenteditable="true"]');
    if (editableHost) {
      editableHost.contentEditable = "false";
      suspendedEditableHost = editableHost;
    }
  });
  function restoreEditableHost() {
    if (suspendedEditableHost) {
      suspendedEditableHost.contentEditable = "true";
      suspendedEditableHost = null;
    }
  }
  doc.addEventListener("mouseup", restoreEditableHost);

  doc.addEventListener("dragstart", (e) => {
    const item = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (!item) return;
    draggedEl = item;
    dimWhileDragging(item);
    e.dataTransfer?.setData(DRAG_MIME + "-nested", "1");
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    // stopImmediatePropagation, NOT stopPropagation: both this listener
    // and attachDragReorder's block-level one are registered on the SAME
    // `doc` target for the same event type. stopPropagation only stops
    // the event reaching OTHER elements/ancestors — it does nothing to
    // stop a second listener attached to this exact same node, so without
    // this the block-level handler still ran right after and treated the
    // whole `.figure-grid`/list block as being dragged too (resolved via
    // its own closest('[data-block-id]') lookup), moving both figures
    // together instead of just the one actually grabbed.
    e.stopImmediatePropagation();
  });

  doc.addEventListener("dragover", (e) => {
    if (!draggedEl) return;
    const target = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    if (!target || target.parentElement !== draggedEl.parentElement || target === draggedEl) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const horizontal = target.parentElement!.classList.contains("figure-grid");
    const indicator = ensureNestedDropIndicator(doc, horizontal);
    const rect = target.getBoundingClientRect();
    const before = horizontal ? e.clientX < rect.left + rect.width / 2 : e.clientY < rect.top + rect.height / 2;
    target.parentElement!.insertBefore(indicator, before ? target : target.nextSibling);
  });

  doc.addEventListener("drop", (e) => {
    if (!draggedEl) return;
    const target = (e.target as Element).closest<HTMLElement>(ITEM_SELECTOR);
    const indicator = doc.getElementById("__nested_drop_indicator__");
    if (target && target.parentElement === draggedEl.parentElement && indicator?.parentElement) {
      e.preventDefault();
      e.stopImmediatePropagation();
      indicator.parentElement.insertBefore(draggedEl, indicator);
      onMoved();
    }
    indicator?.remove();
    // Must undim HERE, not (only) in the dragend handler below: "drop"
    // always fires before "dragend" on a successful drop, and this line
    // nulls draggedEl right after — dragend's own undim(draggedEl) would
    // then be undimming `null` and silently do nothing, permanently
    // leaving the moved item faded. dragend's call stays in place too,
    // since it's still needed for a CANCELLED drag (dropped somewhere
    // invalid), where "drop" never fires and draggedEl is still set.
    undim(draggedEl);
    draggedEl = null;
  });

  doc.addEventListener("dragend", () => {
    doc.getElementById("__nested_drop_indicator__")?.remove();
    undim(draggedEl);
    draggedEl = null;
    restoreEditableHost(); // belt-and-suspenders alongside the mouseup listener above
  });
}

export function attachDragReorder(doc: Document, onMoved: () => void) {
  let draggedId: string | null = null;

  doc.addEventListener("dragstart", (e) => {
    const block = (e.target as Element).closest<HTMLElement>("[data-block-id]");
    if (!block) return;
    draggedId = block.dataset.blockId ?? null;
    dimWhileDragging(block);
    e.dataTransfer?.setData(DRAG_MIME, draggedId ?? "");
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  });

  doc.addEventListener("dragover", (e) => {
    if (!draggedId) return;
    const target = (e.target as Element).closest<HTMLElement>("[data-block-id]");
    const container = (e.target as Element).closest<HTMLElement>(".page__cols");
    if (!target && !container) return;
    e.preventDefault();

    const indicator = ensureDropIndicator(doc);
    if (target && target.dataset.blockId !== draggedId) {
      const rect = target.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      target.parentElement?.insertBefore(indicator, before ? target : target.nextSibling);
    } else if (container && !target) {
      // The cursor is over blank space inside the column area — NOT
      // "the end of the content", despite that being the old fallback
      // (container.appendChild). CSS multi-column layout means visual
      // position and DOM order diverge: a page's content can run out
      // partway down column 1 (e.g. because a big block got pushed whole
      // into column 2 to avoid splitting it), leaving a visually-empty
      // gap at the bottom of column 1 that is NOT anywhere near "the end"
      // in document order — that's still wherever the actual last block
      // sits, which could visually be in a completely different column.
      // Blindly appending there silently dropped new content in the
      // wrong place. Finding whichever real block's center is physically
      // NEAREST the cursor instead — plain Euclidean distance — naturally
      // resolves to "the block actually above/below this empty space",
      // since a same-column neighbor is almost always far closer than
      // anything in the other column.
      const blocks = Array.from(container.querySelectorAll<HTMLElement>("[data-block-id]")).filter(
        (b) => b.dataset.blockId !== draggedId,
      );
      let nearest: HTMLElement | null = null;
      let nearestDistSq = Infinity;
      for (const b of blocks) {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearest = b;
        }
      }
      if (nearest) {
        const rect = nearest.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        nearest.parentElement?.insertBefore(indicator, before ? nearest : nearest.nextSibling);
      } else {
        container.appendChild(indicator);
      }
    }
  });

  doc.addEventListener("drop", (e) => {
    const container = (e.target as Element).closest<HTMLElement>(".page__cols");
    if (!draggedId || !container) return;
    e.preventDefault();

    const draggedEl = doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`);
    const indicator = doc.getElementById("__drop_indicator__");
    if (draggedEl && indicator && indicator.parentElement) {
      indicator.parentElement.insertBefore(draggedEl, indicator);
      onMoved();
    }
    indicator?.remove();
    // Same fix as attachNestedItemReorder's drop handler: undim HERE,
    // before nulling draggedId — dragend's own undim lookup keys off
    // draggedId too, so once this clears it dragend can no longer find
    // the element at all on a successful drop, permanently leaving it
    // faded (exactly what was happening).
    undim(draggedEl);
    draggedId = null;
  });

  doc.addEventListener("dragend", () => {
    doc.getElementById("__drop_indicator__")?.remove();
    if (draggedId) undim(doc.querySelector<HTMLElement>(`[data-block-id="${draggedId}"]`));
    draggedId = null;
  });
}
