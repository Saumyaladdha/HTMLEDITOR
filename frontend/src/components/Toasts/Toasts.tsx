import { useCallback, useRef, useState } from "react";

/**
 * Transient status messages.
 *
 * Errors were previously a single fixed line of red text in the bottom-left
 * corner that never dismissed itself, could be covered by other panels, and
 * — because it was one `error` state — could only ever show the most recent
 * problem. Worse, the failures that matter most were shown NOWHERE: a failing
 * autosave was swallowed by an empty `catch {}`, so a teacher could edit for
 * an hour with "● Unsaved changes" in the header and never learn that every
 * save attempt was being rejected.
 */

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Optional inline action, e.g. "Retry" / "Reload". */
  action?: { label: string; run: () => void };
  /** Errors stay until dismissed; everything else auto-expires. */
  sticky?: boolean;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, opts: { action?: Toast["action"]; sticky?: boolean } = {}) => {
      const id = nextId.current++;
      const sticky = opts.sticky ?? kind === "error";
      setToasts((cur) => {
        // Repeating an identical message (an autosave failing every 20s)
        // should not stack up a wall of duplicates.
        const withoutDuplicate = cur.filter((t) => t.message !== message);
        return [...withoutDuplicate, { id, kind, message, action: opts.action, sticky }];
      });
      if (!sticky) window.setTimeout(() => dismiss(id), 4000);
      return id;
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

const KIND_STYLE: Record<ToastKind, { bg: string; border: string; icon: string }> = {
  info: { bg: "var(--shell-800)", border: "var(--shell-600)", icon: "ℹ" },
  success: { bg: "rgba(63,207,142,0.12)", border: "var(--good)", icon: "✓" },
  error: { bg: "rgba(224,119,122,0.12)", border: "var(--bad)", icon: "⚠" },
};

export default function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 200,
        maxWidth: 420,
      }}
    >
      {toasts.map((t) => {
        const style = KIND_STYLE[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12.5,
              color: "var(--ink-100)",
              boxShadow: "0 12px 30px -10px rgba(0,0,0,0.6)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span aria-hidden style={{ color: style.border }}>{style.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.action && (
              <button
                className="btn"
                style={{ fontSize: 11, padding: "3px 9px" }}
                onClick={() => {
                  t.action!.run();
                  onDismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              className="btn icon-only"
              aria-label="Dismiss"
              style={{ fontSize: 11, padding: "2px 6px", background: "transparent" }}
              onClick={() => onDismiss(t.id)}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
