"use client";

/**
 * Dev-only polygon calibrator (shared by the facade and the floor plan).
 *
 * Open the site with `?calibrate`. Pick a shape, drag its vertices onto the
 * artwork, click a `+` on an edge to fold in a new point, right-click (or
 * Alt-click) a point to drop it, then Copy — you get the literal array to paste
 * into `src/lib/building.ts`.
 *
 * Everything is expressed in the artwork's OWN coordinate space (`viewW`×`viewH`)
 * because the frame it sits in is locked to that artwork's aspect ratio: reading
 * the frame's bounding box is enough to turn pointer pixels into artwork units.
 *
 * Loaded via next/dynamic and rendered only when the query param is present, so
 * it never reaches a visitor.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GOLD = "#B69A78";
const INK = "#101109";

export type PolyItem = { id: string; label: string; points: [number, number][] };

type Drag =
  | { kind: "vertex"; id: string; index: number; sx: number; sy: number; start: [number, number][] }
  | { kind: "move"; id: string; sx: number; sy: number; start: [number, number][] }
  | null;

export default function PolygonCalibrator({
  items,
  selectedId,
  onSelect,
  onChange,
  frameRef,
  viewW,
  viewH,
  title,
  decimals,
  serialize,
  onReset,
  onOpen,
  openLabel,
}: {
  items: PolyItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (items: PolyItem[]) => void;
  frameRef: React.RefObject<HTMLDivElement | null>;
  viewW: number;
  viewH: number;
  title: string;
  decimals: number;
  serialize: (items: PolyItem[]) => string;
  onReset: () => void;
  /** Optional action for the selected shape (e.g. open its floor plan). */
  onOpen?: () => void;
  openLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<Drag>(null);

  const pow = 10 ** decimals;
  const round = (n: number) => Math.round(n * pow) / pow;
  const clampX = (n: number) => Math.max(0, Math.min(viewW, n));
  const clampY = (n: number) => Math.max(0, Math.min(viewH, n));

  const set = (id: string, points: [number, number][]) =>
    onChange(items.map((it) => (it.id === id ? { ...it, points } : it)));

  /* ── drag: convert px delta → artwork units ── */
  const startVertex = (e: React.PointerEvent, id: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    onSelect(id);
    const it = items.find((i) => i.id === id)!;
    drag.current = { kind: "vertex", id, index, sx: e.clientX, sy: e.clientY, start: it.points.map((p) => [...p] as [number, number]) };
  };
  const startMove = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    onSelect(id);
    const it = items.find((i) => i.id === id)!;
    drag.current = { kind: "move", id, sx: e.clientX, sy: e.clientY, start: it.points.map((p) => [...p] as [number, number]) };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const frame = frameRef.current;
    if (!d || !frame) return;
    const box = frame.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / box.width) * viewW;
    const dy = ((e.clientY - d.sy) / box.height) * viewH;

    if (d.kind === "vertex") {
      const pts = d.start.map((p, i) =>
        i === d.index ? ([round(clampX(p[0] + dx)), round(clampY(p[1] + dy))] as [number, number]) : p
      );
      set(d.id, pts);
    } else {
      const pts = d.start.map((p) => [round(clampX(p[0] + dx)), round(clampY(p[1] + dy))] as [number, number]);
      set(d.id, pts);
    }
  };
  const endDrag = () => {
    drag.current = null;
  };

  const insertAfter = (id: string, i: number) => {
    const it = items.find((x) => x.id === id)!;
    const a = it.points[i];
    const b = it.points[(i + 1) % it.points.length];
    const mid: [number, number] = [round((a[0] + b[0]) / 2), round((a[1] + b[1]) / 2)];
    const pts = [...it.points.slice(0, i + 1), mid, ...it.points.slice(i + 1)];
    onSelect(id);
    set(id, pts);
  };
  const removeVertex = (e: React.MouseEvent, id: string, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    const it = items.find((x) => x.id === id)!;
    if (it.points.length <= 3) return; // a polygon needs three
    set(id, it.points.filter((_, k) => k !== i));
  };

  /* ── keyboard: arrows nudge the whole selected shape ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.key.startsWith("Arrow")) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      const step = (e.altKey ? 0.05 : 0.5) * (viewW <= 100 ? 1 : 4);
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      const it = items.find((i) => i.id === selectedId);
      if (!it) return;
      set(
        selectedId,
        it.points.map((p) => [round(clampX(p[0] + dx)), round(clampY(p[1] + dy))] as [number, number])
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const snippet = serialize(items);

  /** Three rungs — the clipboard API is unavailable on plain-http LAN origins. */
  const copy = async () => {
    setFailed(false);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
        return;
      }
    } catch {}
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
    } catch {}
    taRef.current?.focus();
    taRef.current?.select();
    setFailed(true);
  };

  const pct = (x: number, y: number) => ({ left: `${(x / viewW) * 100}%`, top: `${(y / viewH) * 100}%` });

  return (
    <>
      {/* editable shapes, in the artwork's own coordinate space */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 40 }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* the polygons themselves */}
        <svg viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {items.map((it) => {
            const on = it.id === selectedId;
            return (
              <polygon
                key={it.id}
                points={it.points.map((p) => p.join(",")).join(" ")}
                fill={on ? "rgba(182,154,120,0.16)" : "rgba(182,154,120,0.05)"}
                stroke={on ? GOLD : "rgba(182,154,120,0.55)"}
                strokeWidth={1.5}
                strokeDasharray={on ? undefined : "4 4"}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "move", pointerEvents: "auto" }}
                onPointerDown={(e) => startMove(e, it.id)}
              />
            );
          })}
        </svg>

        {/* labels */}
        {items.map((it) => {
          const cx = it.points.reduce((a, p) => a + p[0], 0) / it.points.length;
          const cy = it.points.reduce((a, p) => a + p[1], 0) / it.points.length;
          return (
            <span
              key={`lbl-${it.id}`}
              className="annot"
              style={{
                position: "absolute",
                ...pct(cx, cy),
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                fontSize: 11,
                color: "#F2EDE6",
                background: "rgba(16,17,9,0.82)",
                padding: "2px 7px",
              }}
            >
              {it.label}
            </span>
          );
        })}

        {/* selected shape: edge inserts + vertex handles */}
        {items
          .filter((it) => it.id === selectedId)
          .map((it) =>
            it.points.map((p, i) => {
              const b = it.points[(i + 1) % it.points.length];
              const mid: [number, number] = [(p[0] + b[0]) / 2, (p[1] + b[1]) / 2];
              return (
                <div key={`h-${it.id}-${i}`}>
                  {/* + insert a fold point on this edge */}
                  <button
                    onClick={() => insertAfter(it.id, i)}
                    title="Pridať bod"
                    style={{
                      position: "absolute",
                      ...pct(mid[0], mid[1]),
                      transform: "translate(-50%, -50%)",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `1px solid ${GOLD}`,
                      background: "rgba(16,17,9,0.85)",
                      color: GOLD,
                      fontSize: 12,
                      lineHeight: "14px",
                      textAlign: "center",
                      cursor: "copy",
                      zIndex: 2,
                    }}
                  >
                    +
                  </button>
                  {/* the vertex — drag to move, right/Alt-click to delete */}
                  <div
                    onPointerDown={(e) => {
                      if (e.altKey) return removeVertex(e as unknown as React.MouseEvent, it.id, i);
                      startVertex(e, it.id, i);
                    }}
                    onContextMenu={(e) => removeVertex(e, it.id, i)}
                    title="Ťahaj · pravý klik = zmazať"
                    style={{
                      position: "absolute",
                      ...pct(p[0], p[1]),
                      transform: "translate(-50%, -50%)",
                      width: 14,
                      height: 14,
                      background: GOLD,
                      border: `2px solid ${INK}`,
                      cursor: "grab",
                      touchAction: "none",
                      zIndex: 3,
                    }}
                  />
                </div>
              );
            })
          )}
      </div>

      {/* Readout — portalled to <body>, since a transformed ancestor would
          otherwise become the containing block for this fixed panel. */}
      {createPortal(
        <div
          style={{
            position: "fixed",
            zIndex: 90,
            right: 20,
            bottom: 20,
            width: 360,
            maxHeight: "calc(100vh - 40px)",
            overflowY: "auto",
            background: "rgba(16,17,9,0.94)",
            border: `1px solid ${GOLD}`,
            padding: "16px 18px",
            color: "#F2EDE6",
          }}
        >
          <p className="annot" style={{ fontSize: 9, color: GOLD, marginBottom: 12 }}>
            {title}
          </p>

          {items.map((it) => {
            const on = it.id === selectedId;
            return (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className="annot"
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  width: "100%",
                  textAlign: "left",
                  fontSize: 10,
                  padding: "6px",
                  marginBottom: 2,
                  color: on ? INK : "#F2EDE6",
                  background: on ? GOLD : "transparent",
                }}
              >
                <span>{it.label}</span>
                <span style={{ opacity: 0.9 }}>{it.points.length} bodov</span>
              </button>
            );
          })}

          <p style={{ fontSize: 10, lineHeight: 1.7, opacity: 0.55, margin: "12px 0" }}>
            Ťahaj body · <b>+</b> na hrane pridá bod · pravý klik / Alt-klik zmaže · šípky = posun · Alt = jemne
          </p>

          {onOpen && (
            <button
              onClick={onOpen}
              className="annot"
              style={{
                display: "block",
                width: "100%",
                fontSize: 10,
                padding: "9px 0",
                marginBottom: 8,
                border: `1px solid ${GOLD}`,
                color: GOLD,
                background: "transparent",
              }}
            >
              {openLabel ?? "OTVORIŤ"} →
            </button>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={copy}
              className="annot"
              style={{ flex: 1, fontSize: 10, padding: "10px 0", background: GOLD, color: INK }}
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

          <textarea
            ref={taRef}
            readOnly
            value={snippet}
            onFocus={(e) => e.currentTarget.select()}
            spellCheck={false}
            style={{
              marginTop: 10,
              width: "100%",
              height: 132,
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
