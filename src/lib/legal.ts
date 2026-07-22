/**
 * The single source of truth for the legal documents (privacy policy + cookie
 * policy) and the consent UI. Every legal page reads the controller's identity
 * from here, so it is spelled once and changed in one place.
 *
 * If any identity value is ever blanked back to a "[doplniť …]" placeholder,
 * LEGAL_INCOMPLETE flips true and the legal pages show a discreet "document is
 * being finalised" notice automatically.
 */

export const LEGAL = {
  /** Obchodné meno prevádzkovateľa. */
  controllerName: "ST BRAND s. r. o.",
  /** Sídlo — ulica a číslo, PSČ, mesto. */
  seat: "Hollého 12, 949 01 Nitra",
  /** IČO. */
  ico: "53714679",
  /** DIČ — nepovinné; nechajte prázdne, ak sa nemá zobraziť. */
  dic: "2121468195",
  /** Zápis v obchodnom / živnostenskom registri. */
  register: "Zapísaná v Obchodnom registri Okresného súdu Nitra, oddiel: Sro, vložka č. 62518/N",

  /** Contact particulars — these are known and final. */
  email: "info@animaresidences.sk",
  phone: "+421 948 341 154",
  phoneHref: "+421948341154",
  web: "animaresidences.sk",

  /** Účinnosť / posledná aktualizácia dokumentov. */
  effective: "22. júla 2026",
} as const;

/**
 * The Slovak supervisory authority — fixed public data, quoted so the "right to
 * lodge a complaint" section is complete and actionable.
 */
export const SUPERVISOR = {
  name: "Úrad na ochranu osobných údajov Slovenskej republiky",
  address: "Hraničná 12, 820 07 Bratislava 27",
  email: "statny.dozor@pdp.gov.sk",
  phone: "+421 /2/ 3231 3214",
  web: "dataprotection.gov.sk",
} as const;

/** The third parties that may receive data — kept beside the identity they annotate. */
export const RECIPIENTS = {
  hosting: "Vercel Inc. (USA)",
  email: "Resend (doručovanie e-mailov z formulára)",
  maps: "Google Ireland Ltd. / Google LLC (Google Maps)",
  tiles: "CARTO a OpenStreetMap (mapové podklady)",
} as const;

/** True while any controller-identity placeholder is still present. */
export const LEGAL_INCOMPLETE = [
  LEGAL.controllerName,
  LEGAL.seat,
  LEGAL.ico,
  LEGAL.register,
].some((v) => v.includes("doplniť"));
