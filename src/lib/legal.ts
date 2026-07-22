/**
 * The single source of truth for the legal documents (privacy policy + cookie
 * policy) and the consent UI. Every legal page and notice reads the controller's
 * identity from here, so it is spelled once and finalised in one place.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  ⚠️  TO FINALISE — replace the four "[doplniť …]" values below with the real
 *      identification data of the DATA CONTROLLER (the company selling the
 *      project). These are the only things that cannot be inferred; everything
 *      else in the documents is complete. While a placeholder remains, the legal
 *      pages show a discreet "document is being finalised" notice automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const LEGAL = {
  /** Obchodné meno prevádzkovateľa (napr. „Anima Development s. r. o."). */
  controllerName: "[doplniť: obchodné meno prevádzkovateľa]",
  /** Sídlo — ulica a číslo, PSČ, mesto. */
  seat: "[doplniť: sídlo prevádzkovateľa]",
  /** IČO. */
  ico: "[doplniť: IČO]",
  /** DIČ — nepovinné; nechajte prázdne, ak sa nemá zobraziť. */
  dic: "",
  /** Zápis: napr. „Obchodný register Okresného súdu Nitra, oddiel: Sro, vložka č. …". */
  register: "[doplniť: zápis v obchodnom / živnostenskom registri]",

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
