"use client";

/**
 * Dev-only facade calibrator — a thin adapter over PolygonCalibrator.
 *
 * Open the site with `?calibrate`, drag each floor's vertices onto `predok.jpeg`
 * (add points to fold the band around the corner), then Copy the FLOOR_GEOMETRY
 * object and paste it into `src/lib/building.ts`.
 *
 * Coordinates are percentages of the photo; the parent `.bld-frame` is locked to
 * its aspect ratio, so the frame's bounding box converts pointer pixels to %.
 */

import { useEffect, useState } from "react";
import PolygonCalibrator, { type PolyItem } from "@/components/dev/PolygonCalibrator";
import type { FloorGeometry, FloorId, Pt } from "@/lib/building";

const IDS: FloorId[] = ["4NP", "3NP", "2NP", "1NP"];

const round = (n: number) => Math.round(n * 100) / 100;

function serialize(items: PolyItem[]) {
  const rows = items
    .map((it) => {
      const pts = it.points.map(([x, y]) => `[${round(x)}, ${round(y)}]`).join(", ");
      return `  "${it.id}": { poly: [${pts}] },`;
    })
    .join("\n");
  return `export const FLOOR_GEOMETRY: Record<FloorId, FloorGeometry> = {\n${rows}\n};`;
}

export default function FloorCalibrator({
  geometry,
  onChange,
  onSelect,
  frameRef,
  onReset,
  onOpen,
}: {
  geometry: Record<FloorId, FloorGeometry>;
  onChange: (g: Record<FloorId, FloorGeometry>) => void;
  onSelect: (id: FloorId) => void;
  frameRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
  /** Open the given floor's plan — so the apartments can be calibrated too. */
  onOpen: (id: FloorId) => void;
}) {
  const [selected, setSelected] = useState<FloorId>("4NP");
  useEffect(() => onSelect(selected), [selected, onSelect]);

  const items: PolyItem[] = IDS.map((id) => ({ id, label: id, points: geometry[id].poly.map((p) => [...p] as Pt) }));

  return (
    <PolygonCalibrator
      items={items}
      selectedId={selected}
      onSelect={(id) => {
        setSelected(id as FloorId);
        onSelect(id as FloorId);
      }}
      onChange={(next) => {
        const g = { ...geometry };
        for (const it of next) g[it.id as FloorId] = { poly: it.points.map((p) => [...p] as Pt) };
        onChange(g);
      }}
      frameRef={frameRef}
      viewW={100}
      viewH={100}
      title="KALIBRÁCIA PODLAŽÍ"
      decimals={2}
      serialize={serialize}
      onReset={onReset}
      onOpen={() => onOpen(selected)}
      openLabel="OTVORIŤ PÔDORYS"
    />
  );
}
