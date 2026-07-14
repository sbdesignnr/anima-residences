"use client";

/**
 * Dev-only floor calibrator.
 *
 * Open the site with `?calibrate`. Drag a band's edges onto the facade, nudge it
 * with the arrow keys, then Copy — you get the exact `FLOOR_GEOMETRY` object to
 * paste into `src/lib/building.ts`.
 *
 * Everything is expressed as a percentage of the *image*, because the parent
 * `.bld-frame` is locked to building.png's aspect ratio. Reading the frame's
 * bounding box is therefore enough to convert pointer pixels into image %.
 *
 * Loaded via next/dynamic and rendered only when the query param is present, so
 * it never reaches a visitor.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FloorGeometry, FloorId } from "@/lib/building";

const GOLD = "#B69A78";
const IDS: FloorId[] = ["4NP", "3NP", "2NP", "1NP"];

type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** The literal `src/lib/building.ts` block, ready to paste. */
function serialize(g: Record<FloorId, FloorGeometry>) {
  const rows = IDS.map((id) => {
    const f = g[id];
    return `  "${id}": { top: ${round(f.top)}, height: ${round(f.height)}, left: ${round(f.left)}, width: ${round(f.width)} },`;
  }).join("\n");
  return `export const FLOOR_GEOMETRY: Record<FloorId, FloorGeometry> = {\n${rows}\n};`;
}

export default function FloorCalibrator({
  geometry,
  onChange,
  onSelect,
  frameRef,
  onReset,
}: {
  geometry: Record<FloorId, FloorGeometry>;
  onChange: (g: Record<FloorId, FloorGeometry>) => void;
  onSelect: (id: FloorId) => void;
  frameRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<FloorId>("4NP");
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{
    handle: Handle;
    id: FloorId;
    startX: number;
    startY: number;
    start: FloorGeometry;
  } | null>(null);

  const select = useCallback(
    (id: FloorId) => {
      setSelected(id);
      onSelect(id);
    },
    [onSelect]
  );

  useEffect(() => onSelect(selected), [selected, onSelect]);

  /* ── pointer drag: convert px delta -> image % ── */
  const onPointerDown = (e: React.PointerEvent, id: FloorId, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    select(id);
    drag.current = {
      handle,
      id,
      startX: e.clientX,
      startY: e.clientY,
      start: { ...geometry[id] },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const frame = frameRef.current;
    if (!d || !frame) return;

    const box = frame.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / box.width) * 100;
    const dy = ((e.clientY - d.startY) / box.height) * 100;

    const s = d.start;
    let { top, height, left, width } = s;
    const h = d.handle;

    if (h === "move") {
      top = s.top + dy;
      left = s.left + dx;
    }
    // Edges move independently; the opposite edge stays put.
    if (h.includes("n")) {
      top = s.top + dy;
      height = s.height - dy;
    }
    if (h.includes("s")) height = s.height + dy;
    if (h.includes("w")) {
      left = s.left + dx;
      width = s.width - dx;
    }
    if (h.includes("e")) width = s.width + dx;

    // Never let a band invert itself.
    if (height < 0.5) height = 0.5;
    if (width < 0.5) width = 0.5;

    onChange({
      ...geometry,
      [d.id]: {
        top: clamp(round(top)),
        height: round(height),
        left: clamp(round(left)),
        width: round(width),
      },
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  /* ── keyboard: arrows nudge, shift+arrows resize, 0.1% steps ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.key.startsWith("Arrow")) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();

      const step = e.altKey ? 0.01 : 0.1;
      const g = { ...geometry[selected] };

      if (e.shiftKey) {
        if (e.key === "ArrowUp") g.height = Math.max(0.5, g.height - step);
        if (e.key === "ArrowDown") g.height += step;
        if (e.key === "ArrowLeft") g.width = Math.max(0.5, g.width - step);
        if (e.key === "ArrowRight") g.width += step;
      } else {
        if (e.key === "ArrowUp") g.top -= step;
        if (e.key === "ArrowDown") g.top += step;
        if (e.key === "ArrowLeft") g.left -= step;
        if (e.key === "ArrowRight") g.left += step;
      }

      onChange({
        ...geometry,
        [selected]: {
          top: clamp(round(g.top)),
          height: round(g.height),
          left: clamp(round(g.left)),
          width: round(g.width),
        },
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [geometry, selected, onChange]);

  const snippet = serialize(geometry);

  /**
   * Three rungs, because the clipboard API is unavailable on plain-http origins
   * (testing on http://192.168.1.11) and can be denied outright:
   *   1. navigator.clipboard        2. execCommand("copy")   3. select the box
   */
  const copy = async () => {
    setFailed(false);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
        return;
      }
    } catch {
      /* fall through */
    }

    try {
      const ta = taRef.current;
      if (ta) {
        ta.focus();
        ta.select();
        if (document.execCommand("copy")) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
          return;
        }
      }
    } catch {
      /* fall through */
    }

    // Last resort: the snippet is already selected below — say so.
    taRef.current?.focus();
    taRef.current?.select();
    setFailed(true);
  };

  const handleStyle = (cursor: string): React.CSSProperties => ({
    position: "absolute",
    width: 12,
    height: 12,
    background: GOLD,
    border: "1px solid #101109",
    cursor,
    zIndex: 2,
  });

  return (
    <>
      {/* the editable bands, in the image's own coordinate space */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 40 }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {IDS.map((id) => {
          const g = geometry[id];
          const on = id === selected;
          return (
            <div
              key={id}
              onPointerDown={(e) => onPointerDown(e, id, "move")}
              style={{
                position: "absolute",
                top: `${g.top}%`,
                left: `${g.left}%`,
                width: `${g.width}%`,
                height: `${g.height}%`,
                border: `1.5px ${on ? "solid" : "dashed"} ${on ? GOLD : "rgba(182,154,120,0.55)"}`,
                background: on ? "rgba(182,154,120,0.16)" : "rgba(182,154,120,0.05)",
                cursor: "move",
                boxShadow: on ? "0 0 0 1px rgba(0,0,0,0.6)" : "none",
              }}
            >
              <span
                className="annot"
                style={{
                  position: "absolute",
                  top: 4,
                  left: 6,
                  fontSize: 10,
                  color: "#F2EDE6",
                  background: "rgba(16,17,9,0.85)",
                  padding: "2px 6px",
                  pointerEvents: "none",
                }}
              >
                {id}
              </span>

              {on && (
                <>
                  {/* edges */}
                  <div onPointerDown={(e) => onPointerDown(e, id, "n")} style={{ ...handleStyle("ns-resize"), top: -6, left: "50%", marginLeft: -6 }} />
                  <div onPointerDown={(e) => onPointerDown(e, id, "s")} style={{ ...handleStyle("ns-resize"), bottom: -6, left: "50%", marginLeft: -6 }} />
                  <div onPointerDown={(e) => onPointerDown(e, id, "w")} style={{ ...handleStyle("ew-resize"), left: -6, top: "50%", marginTop: -6 }} />
                  <div onPointerDown={(e) => onPointerDown(e, id, "e")} style={{ ...handleStyle("ew-resize"), right: -6, top: "50%", marginTop: -6 }} />
                  {/* corners */}
                  <div onPointerDown={(e) => onPointerDown(e, id, "nw")} style={{ ...handleStyle("nwse-resize"), top: -6, left: -6 }} />
                  <div onPointerDown={(e) => onPointerDown(e, id, "ne")} style={{ ...handleStyle("nesw-resize"), top: -6, right: -6 }} />
                  <div onPointerDown={(e) => onPointerDown(e, id, "sw")} style={{ ...handleStyle("nesw-resize"), bottom: -6, left: -6 }} />
                  <div onPointerDown={(e) => onPointerDown(e, id, "se")} style={{ ...handleStyle("nwse-resize"), bottom: -6, right: -6 }} />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Readout — portalled to <body>. `.bld-frame` is transformed, and a
          transformed ancestor becomes the containing block for `position:
          fixed`, which pushed this panel off-screen. */}
      {/* No `mounted` gate: this component is imported with { ssr: false }, so it
          never renders on a server and document is always there by the time it
          does. The flag was guarding against a render that cannot happen. */}
      {createPortal(
          <div
            style={{
              position: "fixed",
              zIndex: 90,
              right: 20,
              bottom: 20,
              width: 340,
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              background: "rgba(16,17,9,0.94)",
              border: `1px solid ${GOLD}`,
              padding: "16px 18px",
              color: "#F2EDE6",
            }}
          >
        <p className="annot" style={{ fontSize: 9, color: GOLD, marginBottom: 12 }}>
          KALIBRÁCIA PODLAŽÍ
        </p>

        {IDS.map((id) => {
          const g = geometry[id];
          const on = id === selected;
          return (
            <button
              key={id}
              onClick={() => select(id)}
              className="annot"
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr",
                width: "100%",
                textAlign: "left",
                fontSize: 10,
                padding: "6px 6px",
                marginBottom: 2,
                color: on ? "#101109" : "#F2EDE6",
                background: on ? GOLD : "transparent",
              }}
            >
              <span>{id}</span>
              <span style={{ opacity: 0.9 }}>
                t {round(g.top)} · h {round(g.height)} · l {round(g.left)} · w {round(g.width)}
              </span>
            </button>
          );
        })}

        <p style={{ fontSize: 10, lineHeight: 1.7, opacity: 0.55, margin: "12px 0" }}>
          Ťahaj hrany · šípky = posun 0,1 % · Shift+šípky = veľkosť · Alt = 0,01 %
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={copy}
            className="annot"
            style={{ flex: 1, fontSize: 10, padding: "10px 0", background: GOLD, color: "#101109" }}
          >
            {copied ? "SKOPÍROVANÉ ✓" : failed ? "OZNAČENÉ — STLAČ ⌘C" : "COPY"}
          </button>
          <button
            onClick={onReset}
            className="annot"
            style={{ fontSize: 10, padding: "10px 14px", border: `1px solid ${GOLD}`, color: GOLD }}
          >
            RESET
          </button>
        </div>

        {/* Always visible: if the clipboard is blocked, select this and copy. */}
        <textarea
          ref={taRef}
          readOnly
          value={snippet}
          onFocus={(e) => e.currentTarget.select()}
          spellCheck={false}
          style={{
            marginTop: 10,
            width: "100%",
            height: 96,
            resize: "vertical",
            background: "#0b0c07",
            border: "1px solid rgba(182,154,120,0.3)",
            color: "rgba(242,237,230,0.75)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 9,
            lineHeight: 1.5,
            padding: 8,
          }}
        />
          </div>,
          document.body
        )}
    </>
  );
}
