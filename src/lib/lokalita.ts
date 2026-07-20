/**
 * Lokalita — the data behind the interactive places explorer.
 *
 * Every place carries its DIRECTION from the residence (degrees, 0 = north,
 * clockwise), how long it takes on foot / by bike / by car, a short line, a
 * `slug` (its photo filename) and an optional `maps` query. The explorer shows
 * one place at a time in a large preview with its photo and a "Trasa" button
 * that opens Google Maps directions to it.
 *
 * Times are indicative for the Nitra setting and are trivial to fine-tune — the
 * client only ever edits this one file.
 *
 * PHOTOS. Drop a photo per place into `assets/images/lokalita/<slug>.jpg`
 * (e.g. `sihot.jpg`) and run `npm run media`. The pipeline writes AVIF/WebP and
 * records the slug in `lokalita-photos.json`; the preview then shows the real
 * photo in place of the category placeholder — automatically, no code change.
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
  /** Photo filename stem — assets/images/lokalita/<slug>.jpg. */
  slug: string;
  /** Direction from the residence, degrees. 0 = north, clockwise. */
  dir: number;
  /** Minutes on foot / by bike / by car. */
  walk: number;
  bike: number;
  car: number;
  /** One line for the preview. */
  note: string;
  /** Google Maps destination — a place name or "lat,lng". Defaults to name + Nitra. */
  maps?: string;
};

export const POIS: Poi[] = [
  // Príroda & šport
  { name: "Mestský park Sihoť", cat: "priroda", slug: "sihot", dir: 18, walk: 6, bike: 3, car: 3, note: "Zeleň a promenáda hneď za rohom — najbližší kus prírody.", maps: "Mestský park Sihoť, Nitra" },
  { name: "Nábrežie rieky Nitra", cat: "priroda", slug: "nabrezie", dir: 300, walk: 8, bike: 3, car: 4, note: "Súvislý cyklochodník pozdĺž vody až do centra.", maps: "Nábrežie rieky Nitra" },
  { name: "Zobor — vyhliadka", cat: "priroda", slug: "zobor", dir: 44, walk: 24, bike: 11, car: 9, note: "Lesné chodníky a výhľad na celú Nitru nad mestom.", maps: "Zoborská vyhliadka Pyramída, Nitra" },
  { name: "Tenisový areál", cat: "priroda", slug: "tenis", dir: 124, walk: 12, bike: 5, car: 4, note: "Antukové kurty a šport na pár minút od domova.", maps: "Tenisový klub Nitra" },
  { name: "Wellness & fitness", cat: "priroda", slug: "wellness", dir: 152, walk: 9, bike: 4, car: 4, note: "Sauna, bazén a posilňovňa pre každodennú kondíciu.", maps: "wellness fitness Nitra" },

  // Gastronómia
  { name: "Kaviareň", cat: "gastro", slug: "kaviaren", dir: 350, walk: 4, bike: 2, car: 2, note: "Ranná káva na pár krokov od vchodu.", maps: "kaviareň Nitra Zobor" },
  { name: "Reštaurácia", cat: "gastro", slug: "restauracia", dir: 72, walk: 7, bike: 3, car: 3, note: "Obed aj večera bez toho, aby ste sadli do auta.", maps: "reštaurácia Nitra" },
  { name: "Pekáreň", cat: "gastro", slug: "pekaren", dir: 205, walk: 5, bike: 2, car: 2, note: "Čerstvé pečivo a chlieb ráno cestou okolo.", maps: "pekáreň Nitra" },
  { name: "Bistro & vináreň", cat: "gastro", slug: "vinaren", dir: 248, walk: 10, bike: 4, car: 4, note: "Miesto na pohár vína a večer s priateľmi.", maps: "vináreň Nitra" },

  // Nákupy
  { name: "Potraviny", cat: "nakupy", slug: "potraviny", dir: 182, walk: 6, bike: 3, car: 3, note: "Denný nákup vybavíte bez auta.", maps: "potraviny Nitra Zobor" },
  { name: "OC Mlyny", cat: "nakupy", slug: "mlyny", dir: 332, walk: 24, bike: 9, car: 7, note: "Najväčšie nákupné centrum mesta pod jednou strechou.", maps: "OC Mlyny Nitra" },
  { name: "Galéria Nitra", cat: "nakupy", slug: "galeria", dir: 316, walk: 21, bike: 8, car: 6, note: "Móda, služby a stravovanie v centre mesta.", maps: "Galéria Mlyny Nitra" },

  // Vzdelanie
  { name: "Materská škola", cat: "vzdelanie", slug: "materska", dir: 162, walk: 7, bike: 3, car: 3, note: "Škôlka v dochádzkovej vzdialenosti pre najmenších.", maps: "materská škola Nitra" },
  { name: "Základná škola", cat: "vzdelanie", slug: "zakladna", dir: 138, walk: 10, bike: 4, car: 4, note: "Deti do školy bezpečne a pešo.", maps: "základná škola Nitra" },
  { name: "Gymnázium", cat: "vzdelanie", slug: "gymnazium", dir: 62, walk: 16, bike: 7, car: 6, note: "Stredná škola na dosah pre starších študentov.", maps: "gymnázium Nitra" },
  { name: "Univerzita (UKF · SPU)", cat: "vzdelanie", slug: "univerzita", dir: 30, walk: 18, bike: 7, car: 6, note: "Dve univerzity a študentský život v meste.", maps: "Univerzita Konštantína Filozofa v Nitre" },

  // Zdravie
  { name: "Lekáreň", cat: "zdravie", slug: "lekaren", dir: 214, walk: 5, bike: 2, car: 2, note: "Lieky a prvá pomoc pár minút od domu.", maps: "lekáreň Nitra" },
  { name: "Poliklinika", cat: "zdravie", slug: "poliklinika", dir: 100, walk: 14, bike: 6, car: 5, note: "Ambulancie a odborní lekári bez cestovania.", maps: "poliklinika Nitra" },
  { name: "Fakultná nemocnica", cat: "zdravie", slug: "nemocnica", dir: 88, walk: 28, bike: 11, car: 8, note: "Kompletná nemocničná starostlivosť v meste.", maps: "Fakultná nemocnica Nitra" },

  // Doprava
  { name: "Zastávka MHD", cat: "doprava", slug: "mhd", dir: 194, walk: 3, bike: 1, car: 1, note: "Spoj do centra máte doslova pod oknami.", maps: "zastávka MHD Nitra Zobor" },
  { name: "Železničná stanica", cat: "doprava", slug: "stanica", dir: 282, walk: 20, bike: 8, car: 6, note: "Vlakové spojenie do Bratislavy aj ďalej.", maps: "Železničná stanica Nitra" },
  { name: "Nájazd na R1", cat: "doprava", slug: "r1", dir: 322, walk: 32, bike: 12, car: 6, note: "Bratislava aj Trnava rýchlo po rýchlostnej ceste.", maps: "R1 Nitra" },

  // Kultúra
  { name: "Historické centrum", cat: "kultura", slug: "centrum", dir: 306, walk: 16, bike: 7, car: 6, note: "Staré uličky, kaviarne a život mesta.", maps: "Svätoplukovo námestie, Nitra" },
  { name: "Nitriansky hrad", cat: "kultura", slug: "hrad", dir: 312, walk: 19, bike: 8, car: 7, note: "Dominanta mesta s tisícročnou históriou.", maps: "Nitriansky hrad" },
  { name: "Divadlo A. Bagara", cat: "kultura", slug: "divadlo", dir: 296, walk: 17, bike: 7, car: 6, note: "Najväčšie divadlo v regióne — kultúra na večer.", maps: "Divadlo Andreja Bagara Nitra" },
];

/** Google Maps directions to a place — user's location as origin. */
export const mapsUrl = (p: Poi) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.maps ?? `${p.name}, Nitra`)}`;

/** A rough compass word for a bearing, for the preview. */
export const bearingWord = (dir: number) => {
  const names = ["sever", "severovýchod", "východ", "juhovýchod", "juh", "juhozápad", "západ", "severozápad"];
  return names[Math.round(dir / 45) % 8];
};

/** The wider connections — shown as a clean travel-time ledger. */
export const CONNECTIONS: { to: string; km: number; min: number }[] = [
  { to: "Centrum Nitry", km: 2, min: 6 },
  { to: "Diaľnica R1", km: 4, min: 6 },
  { to: "Trnava", km: 48, min: 32 },
  { to: "Bratislava", km: 92, min: 55 },
  { to: "Letisko M. R. Štefánika", km: 95, min: 58 },
];
