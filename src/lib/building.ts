/**
 * Building geometry & data.
 *
 * `FLOOR_GEOMETRY` is the only thing you ever need to tune, and it is the exact
 * shape the in-page calibrator emits — open the site with `?calibrate`, drag the
 * bands onto the facade, hit Copy, and paste the object straight over this one.
 *
 * All values are percentages of building.png itself (1856×1312), NOT of the
 * viewport. The image box keeps the picture's own aspect ratio at every screen
 * size, so these numbers stay welded to the facade.
 *
 * The current values were measured from the pixels: the facade is warm beige
 * (R>G>B, bright) and the slab lines are luminance minima running the full width
 * of it — roof 9.5%, slabs 29.9% / 45.7% / 59.3%, ground 75.3%.
 */

export type FloorId = "4NP" | "3NP" | "2NP" | "1NP";

export type FloorGeometry = {
  /** Top edge, % of image height. */
  top: number;
  /** Band height, % of image height. */
  height: number;
  /** Left edge, % of image width. */
  left: number;
  /** Band width, % of image width. */
  width: number;
};

/* ── paste calibrator output here ────────────────────────────────────── */
export const FLOOR_GEOMETRY: Record<FloorId, FloorGeometry> = {
  "4NP": { top: 9.08, height: 18.98, left: 30.38, width: 46.85 },
  "3NP": { top: 28.22, height: 17.64, left: 30.39, width: 62.2 },
  "2NP": { top: 45.28, height: 16.27, left: 30.38, width: 62.23 },
  "1NP": { top: 60.38, height: 23.59, left: 30.44, width: 62.17 },
};
/* ────────────────────────────────────────────────────────────────────── */

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
  { id: "4NP", byty: 3, volne: 3, vymera: "45 – 70 m²", cena: "od 245 000 €", cenaOd: 245000, level: "+9,300", areas: [45, 70, 50] },
  { id: "3NP", byty: 3, volne: 1, vymera: "45 – 70 m²", cena: "od 198 000 €", cenaOd: 198000, level: "+6,200", areas: [45, 70, 50] },
  { id: "2NP", byty: 3, volne: 2, vymera: "45 – 70 m²", cena: "od 185 000 €", cenaOd: 185000, level: "+3,100", areas: [45, 70, 50] },
  { id: "1NP", byty: 3, volne: 0, vymera: "45 – 70 m²", cena: "od 175 000 €", cenaOd: 175000, level: "±0,000", areas: [45, 70, 50] },
];

export type Floor = FloorData & FloorGeometry;

export const buildFloors = (geometry: Record<FloorId, FloorGeometry>): Floor[] =>
  FLOOR_DATA.map((f) => ({ ...f, ...geometry[f.id] }));

export const centerOf = (f: FloorGeometry) => f.top + f.height / 2;

/* ─────────────────────── floorplan (podorys.png) ───────────────────────
 * 1042×1316. Structural walls measured from the drawing's pixels:
 *   vertical core walls  x = 358 (34.4%) and x = 686 (65.8%)
 *   thick party wall     y = 409..444 (31.1..33.7%) in the left bay
 * Arrows in the drawing: A ◀ left bay · B ▲ centre-north · C ▶ right bay.
 * The centre-south block is the stair/lift core — not a unit.
 * ------------------------------------------------------------------- */
export const PLAN_W = 1042;
export const PLAN_H = 1316;

export type UnitLetter = "A" | "B" | "C";

export type Unit = {
  letter: UnitLetter;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  rooms: string;
};

export const UNITS: Unit[] = [
  { letter: "A", x: 24, y: 22, w: 334, h: 1244, area: 45, rooms: "2-izbový" },
  { letter: "B", x: 358, y: 22, w: 328, h: 422, area: 70, rooms: "3-izbový" },
  { letter: "C", x: 686, y: 22, w: 332, h: 1244, area: 50, rooms: "2-izbový" },
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
  stav: "Voľný" | "Rezervovaný";
};

export function apartmentsFor(floor: Floor): Apartment[] {
  const n = floor.id.replace("NP", "");
  return UNITS.map((unit, i) => ({
    id: `${n}${unit.letter}`,
    floorId: floor.id,
    unit,
    dispozicia: unit.rooms,
    vymera: `${unit.area} m²`,
    balkon: i === 0 ? "Nie" : `${6 + i * 2} m²`,
    pivnica: `${3 + i} m²`,
    parkovanie: i === 0 ? "1 státie" : "2 státia",
    cena: `${(floor.cenaOd + i * 18000).toLocaleString("sk-SK")} €`,
    stav: i < floor.volne ? "Voľný" : "Rezervovaný",
  }));
}

/** Slovak plurals: 1 / 2–4 / 0 & 5+ */
export const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many;
