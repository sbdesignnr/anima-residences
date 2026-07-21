/**
 * Building geometry & data.
 *
 * `FLOOR_GEOMETRY` is the only thing you ever need to tune, and it is the exact
 * shape the in-page calibrator emits — open the site with `?calibrate`, drag the
 * vertices onto the facade (add or remove points to fold the band around the
 * corner), hit Copy, and paste the object straight over this one.
 *
 * A floor is a POLYGON, not a rectangle. `predok.jpeg` is a three-quarter render:
 * the slab lines slant with the perspective and the band wraps the corner onto
 * the side elevation, so a rectangle can never sit on it. Each floor is therefore
 * a list of points that can be folded ("zalomiť") to trace the real facade.
 *
 * Every coordinate is [x, y] as a PERCENTAGE of the photo itself (1600×1131),
 * NOT of the viewport. The image box keeps the picture's own aspect ratio at
 * every screen size, so these numbers stay welded to the facade.
 *
 * The defaults below trace the front (balcony) elevation between the far corner
 * (~30 %) and the near corner (~54 %); fold them onto the side in the calibrator.
 */

export type FloorId = "4NP" | "3NP" | "2NP" | "1NP";

/** A point as [x, y]. For floors: % of the photo. For units: podorys pixels. */
export type Pt = [number, number];

export type FloorGeometry = {
  /** The shading polygon, following the facade's perspective. % of the photo. */
  poly: Pt[];
};

/* ── paste calibrator output here ────────────────────────────────────── */
export const FLOOR_GEOMETRY: Record<FloorId, FloorGeometry> = {
  "4NP": { poly: [[24.51, 32.91], [44.21, 16.73], [76.57, 40.55], [76.52, 43.36], [53.82, 28.47], [24.57, 44.99]] },
  "3NP": { poly: [[24.46, 44.99], [53.71, 28.55], [76.57, 43.48], [76.32, 54.29], [53.53, 45.73], [24.57, 55.49]] },
  "2NP": { poly: [[24.51, 55.58], [53.64, 45.82], [76.41, 54.32], [76.3, 65.5], [53.88, 62.66], [24.63, 66.16]] },
  "1NP": { poly: [[24.57, 66.16], [53.82, 62.74], [76.24, 65.53], [76.18, 79.11], [53.82, 82.42], [24.51, 78.33]] },
};
/* ────────────────────────────────────────────────────────────────────── */

/** Axis-aligned bounds of a polygon — drives the scale, leader and zoom. */
export const bboxOf = (poly: Pt[]) => {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const [x, y] of poly) {
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
};

/** Vertex average — a stable anchor for a unit's label, even on an L-shape. */
export const centroidOf = (poly: Pt[]): Pt => {
  const n = poly.length || 1;
  let sx = 0, sy = 0;
  for (const [x, y] of poly) { sx += x; sy += y; }
  return [sx / n, sy / n];
};

/** SVG `points` string. */
export const polyStr = (poly: Pt[]) => poly.map(([x, y]) => `${x},${y}`).join(" ");

/** SVG path `d` for a closed polygon (used to punch the scrim's hole). */
export const polyPath = (poly: Pt[]) =>
  poly.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + " Z";

/** Everything about a floor except where it sits on the picture. */
export type FloorData = {
  id: FloorId;
  byty: number;
  volne: number;
  vymera: string;
  cena: string;
  cenaOd: number;
  /** Structural level mark, as on the drawing (±0,000 / +3,100 …). */
  level: string;
  areas: number[];
};

export const FLOOR_DATA: FloorData[] = [
  { id: "4NP", byty: 1, volne: 0, vymera: "65 m²", cena: "294 250 €", cenaOd: 294250, level: "+9,300", areas: [65] },
  { id: "3NP", byty: 3, volne: 0, vymera: "50 – 70 m²", cena: "od 198 790 €", cenaOd: 198790, level: "+6,200", areas: [50, 70, 55] },
  { id: "2NP", byty: 3, volne: 0, vymera: "50 – 70 m²", cena: "od 198 790 €", cenaOd: 198790, level: "+3,100", areas: [50, 70, 55] },
  { id: "1NP", byty: 3, volne: 0, vymera: "45 – 70 m²", cena: "od 174 000 €", cenaOd: 174000, level: "±0,000", areas: [45, 50, 70] },
];

export type Floor = FloorData & FloorGeometry;

export const buildFloors = (geometry: Record<FloorId, FloorGeometry>): Floor[] =>
  FLOOR_DATA.map((f) => ({ ...f, ...geometry[f.id] }));

/** Vertical centre of a floor band, % of the photo — the zoom focal point. */
export const centerOf = (f: FloorGeometry) => {
  const b = bboxOf(f.poly);
  return b.top + b.height / 2;
};

/**
 * The band's vertical extent AT ITS LEFT EDGE — the Y range of the two leftmost
 * vertices. On a 3/4 view the bands slant, so the bbox spans the far, higher
 * corner and its centre rides high; the scale, marker, leader and floor labels
 * all live on the building's left corner and must anchor to THIS instead.
 */
export const leftEdgeOf = (poly: Pt[]) => {
  const [a, b] = [...poly].sort((p, q) => p[0] - q[0]);
  return { top: Math.min(a[1], b[1]), bottom: Math.max(a[1], b[1]) };
};

/** Vertical centre of a floor band where the scale meets it (its left edge). */
export const edgeCenterOf = (f: FloorGeometry) => {
  const e = leftEdgeOf(f.poly);
  return (e.top + e.bottom) / 2;
};

/* ─────────────────────── floorplan (podorys.png) ───────────────────────
 * 1042×1316. Each unit is an exact POLYGON, not a rectangle — a real apartment
 * boundary steps in and out (rovno, doľava, doprava, dole), so the outline has
 * to be traceable point by point. Open `?calibrate` on an opened floor plan to
 * drag the vertices, add or drop points, and Copy the UNITS array back here.
 *
 * Coordinates are podorys pixels. Arrows in the drawing: A ◀ left bay ·
 * B ▲ centre-north · C ▶ right bay. The centre-south block is the stair/lift
 * core — not a unit. The defaults are simple rectangles; reshape as needed.
 * ------------------------------------------------------------------- */
export const PLAN_W = 1042;
export const PLAN_H = 1316;

export type UnitLetter = "A" | "B" | "C";

export type Unit = {
  letter: UnitLetter;
  /** Exact apartment outline, in podorys pixels. Any number of points. */
  poly: Pt[];
  area: number;
  rooms: string;
};

export const UNITS: Unit[] = [
  { letter: "A", poly: [[40, 446], [353, 446], [347, 1230], [40, 1230]], area: 45, rooms: "2-izbový" },
  { letter: "B", poly: [[40, 39], [1001, 39], [1003, 290], [723, 291], [722, 408], [683, 408], [683, 588], [548, 588], [444, 587], [366, 587], [367, 408], [42, 409]], area: 70, rooms: "3-izbový" },
  { letter: "C", poly: [[699, 419], [737, 419], [737, 303], [1001, 303], [1003, 1230], [698, 1230]], area: 50, rooms: "2-izbový" },
];

/** Written per unit type, not per apartment — the layouts repeat on every floor. */
export const UNIT_COPY: Record<UnitLetter, { orientation: string; lead: string; features: string[] }> = {
  A: {
    orientation: "Východ",
    lead:
      "Ranné svetlo padá do obývacej izby skôr, než vstanete. Kuchyňa je otočená do vnútrobloku, takže sa v nej varí do ticha — a spálňa je odsunutá od schodiska, kam nedolieha nič z domu.",
    features: [
      "Obývacia izba s kuchyňou, 4,33 × 4,43 m",
      "Spálňa oddelená od komunikačného jadra",
      "Kúpeľňa s oknom",
      "Pivničná kobka v 1. PP",
    ],
  },
  B: {
    orientation: "Sever · juh",
    lead:
      "Najväčší byt v dome prechádza naprieč celým podlažím. Denná zóna je jeden otvorený priestor 5,59 × 5,15 m s ostrovom; obe spálne sú na opačných koncoch, takže sa nikdy nerušia.",
    features: [
      "Priechodná denná zóna s kuchynským ostrovom",
      "Dve spálne na opačných stranách bytu",
      "Samostatné WC a kúpeľňa",
      "Loggia orientovaná do zelene",
    ],
  },
  C: {
    orientation: "Západ",
    lead:
      "Popoludňajšie svetlo tu zostáva dlho — obývacia izba má 6,40 m do hĺbky a okno až po podlahu. Kuchyňa je vsunutá do niky, aby priestor pôsobil ako jedna miestnosť, nie ako chodba s linkou.",
    features: [
      "Obývacia izba 4,25 × 6,40 m",
      "Kuchyňa v nike, mimo hlavného pohľadu",
      "Spálňa s výhľadom do vnútrobloku",
      "Parkovacie státie v cene",
    ],
  },
};

export type Stav = "Voľný" | "Rezervovaný" | "Predané";

export type Apartment = {
  id: string;
  floorId: FloorId;
  unit: Unit;
  dispozicia: string;
  vymera: string;
  balkon: string;
  pivnica: string;
  parkovanie: string;
  cena: string;
  stav: Stav;
};

/**
 * The real offer, straight from the sales table. The development is SOLD OUT, so
 * every row's `stav` is "Predané". `unitIndex` is the plan bay it occupies
 * (0 = A/left, 1 = B/centre, 2 = C/right). Prices: obytná = obytná m² × 3 700,
 * balkón/terasa = m² × 1 850, kobka = 7 500; `cenaCelkom` is byt + balkón + kobka
 * (the table's "Spolu byt+kobka"). Parking is 15 000 €/state, shown separately.
 */
export type AptSpec = {
  id: string;
  floorId: FloorId;
  unitIndex: number;
  rooms: string;
  obytna: number;
  balkonM2: number;
  balkonKind: "Balkón" | "Terasa";
  cenaByt: number;
  cenaBalkon: number;
  cenaCelkom: number;
  parkovanie: number;
  stav: Stav;
};

export const KOBKA_PRICE = 7500;
export const PARK_PRICE = 15000;

export const APARTMENTS: AptSpec[] = [
  { id: "A1", floorId: "1NP", unitIndex: 0, rooms: "2-izbový", obytna: 45, balkonM2: 0,   balkonKind: "Balkón", cenaByt: 166500, cenaBalkon: 0,     cenaCelkom: 174000, parkovanie: 1, stav: "Predané" },
  { id: "A2", floorId: "1NP", unitIndex: 1, rooms: "2-izbový", obytna: 50, balkonM2: 0,   balkonKind: "Balkón", cenaByt: 185000, cenaBalkon: 0,     cenaCelkom: 192500, parkovanie: 1, stav: "Predané" },
  { id: "A3", floorId: "1NP", unitIndex: 2, rooms: "3-izbový", obytna: 70, balkonM2: 0,   balkonKind: "Balkón", cenaByt: 259000, cenaBalkon: 0,     cenaCelkom: 266500, parkovanie: 1, stav: "Predané" },
  { id: "B1", floorId: "2NP", unitIndex: 0, rooms: "2-izbový", obytna: 50, balkonM2: 3.4, balkonKind: "Balkón", cenaByt: 185000, cenaBalkon: 6290,  cenaCelkom: 198790, parkovanie: 1, stav: "Predané" },
  { id: "B2", floorId: "2NP", unitIndex: 1, rooms: "3-izbový", obytna: 70, balkonM2: 3.4, balkonKind: "Balkón", cenaByt: 259000, cenaBalkon: 6290,  cenaCelkom: 272790, parkovanie: 1, stav: "Predané" },
  { id: "B3", floorId: "2NP", unitIndex: 2, rooms: "2-izbový", obytna: 55, balkonM2: 3.4, balkonKind: "Balkón", cenaByt: 203500, cenaBalkon: 6290,  cenaCelkom: 217290, parkovanie: 1, stav: "Predané" },
  { id: "C1", floorId: "3NP", unitIndex: 0, rooms: "2-izbový", obytna: 50, balkonM2: 3.4, balkonKind: "Balkón", cenaByt: 185000, cenaBalkon: 6290,  cenaCelkom: 198790, parkovanie: 1, stav: "Predané" },
  { id: "C2", floorId: "3NP", unitIndex: 1, rooms: "3-izbový", obytna: 70, balkonM2: 3.4, balkonKind: "Balkón", cenaByt: 259000, cenaBalkon: 6290,  cenaCelkom: 272790, parkovanie: 1, stav: "Predané" },
  { id: "C3", floorId: "3NP", unitIndex: 2, rooms: "2-izbový", obytna: 55, balkonM2: 3.4, balkonKind: "Balkón", cenaByt: 203500, cenaBalkon: 6290,  cenaCelkom: 217290, parkovanie: 1, stav: "Predané" },
  { id: "D1", floorId: "4NP", unitIndex: 0, rooms: "3-izbový", obytna: 65, balkonM2: 25,  balkonKind: "Terasa", cenaByt: 240500, cenaBalkon: 46250, cenaCelkom: 294250, parkovanie: 2, stav: "Predané" },
];

const fmtNum = (n: number) => n.toLocaleString("sk-SK");
const fmtM2 = (n: number) => String(n).replace(".", ",");

export function apartmentsFor(floor: Floor): Apartment[] {
  return APARTMENTS.filter((a) => a.floorId === floor.id).map((a) => ({
    id: a.id,
    floorId: a.floorId,
    unit: UNITS[a.unitIndex] ?? UNITS[0],
    dispozicia: a.rooms,
    vymera: `${a.obytna} m²`,
    balkon: a.balkonM2 > 0 ? `${a.balkonKind} · ${fmtM2(a.balkonM2)} m²` : "—",
    pivnica: "Kobka · 1 ks",
    parkovanie: `${a.parkovanie} ${plural(a.parkovanie, "státie", "státia", "státí")}`,
    cena: `${fmtNum(a.cenaCelkom)} €`,
    stav: a.stav,
  }));
}

/** Slovak plurals: 1 / 2–4 / 0 & 5+ */
export const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many;
