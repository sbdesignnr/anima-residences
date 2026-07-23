"use client";

/**
 * Dev-only floor-plan calibrator — a thin adapter over PolygonCalibrator.
 *
 * Open an opened floor plan with `?calibrate`, trace each apartment's real
 * outline (drag points, click `+` on an edge to fold in, right-click to drop),
 * then Copy the UNITS array and paste it into `src/lib/building.ts`.
 *
 * Coordinates are podorys pixels; `.plan-box` is locked to the drawing's aspect
 * ratio, so its bounding box converts pointer pixels to drawing pixels.
 */

import { useState } from "react";
import PolygonCalibrator, { type PolyItem } from "@/components/dev/PolygonCalibrator";
import { PLAN_H, PLAN_W, type Pt, type Unit } from "@/lib/building";

const round = (n: number) => Math.round(n);

function serialize(items: PolyItem[], units: Unit[], exportName: string) {
  const rows = items
    .map((it) => {
      const u = units.find((x) => x.letter === it.id)!;
      const pts = it.points.map(([x, y]) => `[${round(x)}, ${round(y)}]`).join(", ");
      return `  { letter: "${u.letter}", poly: [${pts}], area: ${u.area}, rooms: "${u.rooms}" },`;
    })
    .join("\n");
  return `export const ${exportName}: Unit[] = [\n${rows}\n];`;
}

export default function PlanCalibrator({
  units,
  onChange,
  frameRef,
  onReset,
  viewW = PLAN_W,
  viewH = PLAN_H,
  exportName = "UNITS",
}: {
  units: Unit[];
  onChange: (u: Unit[]) => void;
  frameRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
  viewW?: number;
  viewH?: number;
  exportName?: string;
}) {
  const [selected, setSelected] = useState<string>(units[0]?.letter ?? "A");

  const items: PolyItem[] = units.map((u) => ({
    id: u.letter,
    label: `Byt ${u.letter}`,
    points: u.poly.map((p) => [...p] as Pt),
  }));

  return (
    <PolygonCalibrator
      items={items}
      selectedId={selected}
      onSelect={setSelected}
      onChange={(next) => {
        onChange(
          units.map((u) => {
            const it = next.find((n) => n.id === u.letter);
            return it ? { ...u, poly: it.points.map((p) => [...p] as Pt) } : u;
          })
        );
      }}
      frameRef={frameRef}
      viewW={viewW}
      viewH={viewH}
      title="KALIBRÁCIA PÔDORYSU"
      decimals={0}
      serialize={(its) => serialize(its, units, exportName)}
      onReset={onReset}
    />
  );
}
