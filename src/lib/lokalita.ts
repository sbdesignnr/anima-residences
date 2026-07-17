/**
 * Lokalita — the data behind the interactive reachability orbit.
 *
 * Every point of interest carries its DIRECTION from the residence (degrees,
 * 0 = north, clockwise) and how long it takes to reach on foot / by bike / by
 * car. The orbit places each point at `angle = dir`, `radius ∝ time` for the
 * chosen mode, so switching mode glides the whole constellation inward or out.
 *
 * Times are indicative for the Nitra setting and are trivial to fine-tune — the
 * client only ever edits this one file.
 */

export type Mode = "walk" | "bike" | "car";

export type CatKey =
  | "gastro"
  | "nakupy"
  | "vzdelanie"
  | "priroda"
  | "zdravie"
  | "doprava"
  | "kultura";

export const CATEGORIES: Record<CatKey, { label: string; color: string }> = {
  priroda: { label: "Príroda & šport", color: "#7CA36C" },
  gastro: { label: "Gastronómia", color: "#D3A25B" },
  nakupy: { label: "Nákupy", color: "#C67E52" },
  vzdelanie: { label: "Vzdelanie", color: "#A2A85F" },
  zdravie: { label: "Zdravie", color: "#C77A6E" },
  doprava: { label: "Doprava", color: "#8AA8C1" },
  kultura: { label: "Kultúra", color: "#B79AC2" },
};

export const MODES: Record<Mode, { label: string; verb: string }> = {
  walk: { label: "Pešo", verb: "pešo" },
  bike: { label: "Bicykel", verb: "na bicykli" },
  car: { label: "Auto", verb: "autom" },
};

export type Poi = {
  name: string;
  cat: CatKey;
  /** Direction from the residence, degrees. 0 = north, clockwise. */
  dir: number;
  /** Minutes on foot / by bike / by car. */
  walk: number;
  bike: number;
  car: number;
  note?: string;
};

export const POIS: Poi[] = [
  // Príroda & šport
  { name: "Mestský park Sihoť", cat: "priroda", dir: 18, walk: 6, bike: 3, car: 3, note: "Zeleň a promenáda hneď za rohom." },
  { name: "Nábrežie rieky Nitra", cat: "priroda", dir: 300, walk: 8, bike: 3, car: 4, note: "Cyklochodník pozdĺž vody." },
  { name: "Zobor — vyhliadka", cat: "priroda", dir: 44, walk: 24, bike: 11, car: 9, note: "Lesné chodníky nad mestom." },
  { name: "Tenisový areál", cat: "priroda", dir: 124, walk: 12, bike: 5, car: 4 },
  { name: "Wellness & fitness", cat: "priroda", dir: 152, walk: 9, bike: 4, car: 4 },

  // Gastronómia
  { name: "Kaviareň", cat: "gastro", dir: 350, walk: 4, bike: 2, car: 2, note: "Ranná káva na pár krokov." },
  { name: "Reštaurácia", cat: "gastro", dir: 72, walk: 7, bike: 3, car: 3 },
  { name: "Pekáreň", cat: "gastro", dir: 205, walk: 5, bike: 2, car: 2 },
  { name: "Bistro & vináreň", cat: "gastro", dir: 248, walk: 10, bike: 4, car: 4 },

  // Nákupy
  { name: "Potraviny", cat: "nakupy", dir: 182, walk: 6, bike: 3, car: 3, note: "Denný nákup bez auta." },
  { name: "OC Mlyny", cat: "nakupy", dir: 332, walk: 24, bike: 9, car: 7 },
  { name: "Galéria Nitra", cat: "nakupy", dir: 316, walk: 21, bike: 8, car: 6 },

  // Vzdelanie
  { name: "Materská škola", cat: "vzdelanie", dir: 162, walk: 7, bike: 3, car: 3 },
  { name: "Základná škola", cat: "vzdelanie", dir: 138, walk: 10, bike: 4, car: 4 },
  { name: "Gymnázium", cat: "vzdelanie", dir: 62, walk: 16, bike: 7, car: 6 },
  { name: "Univerzita (UKF · SPU)", cat: "vzdelanie", dir: 30, walk: 18, bike: 7, car: 6 },

  // Zdravie
  { name: "Lekáreň", cat: "zdravie", dir: 214, walk: 5, bike: 2, car: 2 },
  { name: "Poliklinika", cat: "zdravie", dir: 100, walk: 14, bike: 6, car: 5 },
  { name: "Fakultná nemocnica", cat: "zdravie", dir: 88, walk: 28, bike: 11, car: 8 },

  // Doprava
  { name: "Zastávka MHD", cat: "doprava", dir: 194, walk: 3, bike: 1, car: 1 },
  { name: "Železničná stanica", cat: "doprava", dir: 282, walk: 20, bike: 8, car: 6 },
  { name: "Nájazd na R1", cat: "doprava", dir: 322, walk: 32, bike: 12, car: 6, note: "Bratislava aj Trnava rýchlo dostupné." },

  // Kultúra
  { name: "Historické centrum", cat: "kultura", dir: 306, walk: 16, bike: 7, car: 6 },
  { name: "Nitriansky hrad", cat: "kultura", dir: 312, walk: 19, bike: 8, car: 7 },
  { name: "Divadlo A. Bagara", cat: "kultura", dir: 296, walk: 17, bike: 7, car: 6 },
];

/** The wider connections — shown as a clean travel-time ledger. */
export const CONNECTIONS: { to: string; km: number; min: number }[] = [
  { to: "Centrum Nitry", km: 2, min: 6 },
  { to: "Diaľnica R1", km: 4, min: 6 },
  { to: "Trnava", km: 48, min: 32 },
  { to: "Bratislava", km: 92, min: 55 },
  { to: "Letisko M. R. Štefánika", km: 95, min: 58 },
];
