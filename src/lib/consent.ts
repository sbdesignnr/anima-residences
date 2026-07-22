/**
 * Cookie-consent storage and helpers.
 *
 * Consent is kept in a first-party cookie (`anima_consent`) so it survives across
 * visits and is readable everywhere, with a localStorage mirror as a fallback.
 * The record is versioned: bump CONSENT_VERSION when the categories change and
 * every visitor is asked afresh.
 *
 * Pure module — no React, guards `document`, safe to import from anywhere. The
 * reactive hook lives in `src/components/legal/useConsent.ts`.
 */

/** The opt-in categories. `necessary` is always on and is not stored as a choice. */
export type ConsentValue = { analytics: boolean; maps: boolean };
export type ConsentRecord = ConsentValue & { v: number; ts: number };

export const CONSENT_COOKIE = "anima_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 180;

/** Fired on the window whenever the stored consent changes. */
export const CONSENT_CHANGED = "anima:consent-changed";
/** Fired to ask the banner component to open the settings panel. */
export const CONSENT_OPEN = "anima:consent-open";

/** Everything off but the necessary baseline — the "reject non-essential" state. */
export const CONSENT_DENIED: ConsentValue = { analytics: false, maps: false };
/** Everything on — the "accept all" state. */
export const CONSENT_GRANTED: ConsentValue = { analytics: true, maps: true };

export function readConsent(): ConsentRecord | null {
  if (typeof document === "undefined") return null;
  const raw =
    document.cookie.match(/(?:^|;\s*)anima_consent=([^;]+)/)?.[1] ??
    safeLocal();
  if (!raw) return null;
  try {
    const rec = JSON.parse(decodeURIComponent(raw)) as ConsentRecord;
    // A record from an older category set is treated as "no decision yet".
    if (!rec || rec.v !== CONSENT_VERSION) return null;
    return rec;
  } catch {
    return null;
  }
}

function safeLocal(): string | null {
  try {
    return localStorage.getItem(CONSENT_COOKIE);
  } catch {
    return null;
  }
}

/** Persist a decision and notify every listener (gates, banner) on this page. */
export function saveConsent(value: ConsentValue): ConsentRecord {
  const rec: ConsentRecord = { ...value, v: CONSENT_VERSION, ts: Date.now() };
  const enc = encodeURIComponent(JSON.stringify(rec));
  if (typeof document !== "undefined") {
    const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${CONSENT_COOKIE}=${enc};path=/;max-age=${maxAge};SameSite=Lax`;
    try {
      localStorage.setItem(CONSENT_COOKIE, enc);
    } catch {
      /* private mode — the cookie alone is enough */
    }
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: rec }));
  }
  return rec;
}

/** Has the visitor allowed a given category? False until they actively opt in. */
export function hasConsent(cat: keyof ConsentValue): boolean {
  const rec = readConsent();
  return !!rec && !!rec[cat];
}

/** Ask the banner to open its settings panel (wired to the footer link). */
export function openConsentSettings(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_OPEN));
}
