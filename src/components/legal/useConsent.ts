"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGED, readConsent, type ConsentRecord } from "@/lib/consent";

/**
 * Reactive view of the stored consent. Re-renders the caller whenever the
 * decision changes (accept/reject/save), so a gated embed appears the instant
 * the visitor allows its category — no reload.
 */
export function useConsent(): ConsentRecord | null {
  const [rec, setRec] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    setRec(readConsent());
    const update = () => setRec(readConsent());
    window.addEventListener(CONSENT_CHANGED, update);
    return () => window.removeEventListener(CONSENT_CHANGED, update);
  }, []);

  return rec;
}
