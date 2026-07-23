"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CONSENT_CHANGED,
  CONSENT_DENIED,
  CONSENT_GRANTED,
  CONSENT_OPEN,
  readConsent,
  saveConsent,
  type ConsentValue,
} from "@/lib/consent";

/**
 * The cookie-consent gateway: a first-visit banner and a settings panel.
 *
 * Nothing beyond the necessary baseline runs until the visitor chooses. The
 * choice is stored (see `@/lib/consent`) and broadcast, so a consent-gated embed
 * — currently the Google Maps frame on /kontakt — appears the moment its
 * category is allowed. The footer's "Nastavenia cookies" reopens this panel via
 * the CONSENT_OPEN event, so consent is always withdrawable.
 */

type Panel = "none" | "banner" | "settings";

const CATEGORIES: {
  key: "necessary" | "analytics" | "maps";
  title: string;
  body: string;
  locked?: boolean;
}[] = [
  {
    key: "necessary",
    title: "Nevyhnutné",
    body: "Potrebné na základné fungovanie stránky a na zapamätanie vašej voľby cookies. Bez nich sa web nezaobíde, preto sú vždy aktívne.",
    locked: true,
  },
  {
    key: "analytics",
    title: "Analytické",
    body: "Anonymné meranie návštevnosti, aby sme vedeli web zlepšovať. Aktuálne žiadne nepoužívame — ak ich nasadíme, spustia sa až s vaším súhlasom.",
  },
  {
    key: "maps",
    title: "Mapy a externý obsah",
    body: "Zobrazenie interaktívnej mapy Google na stránke Kontakt. Načítaním môže Google nastaviť vlastné cookies.",
  },
];

export default function CookieConsent() {
  const [panel, setPanel] = useState<Panel>("none");
  const [choice, setChoice] = useState<ConsentValue>(CONSENT_DENIED);

  // Decide what to show once, on the client, from the stored cookie.
  useEffect(() => {
    // The admin calibration overlay (?calibrate) sits bottom-right; keep the
    // banner out of its way — a calibrating session isn't a real visit anyway.
    if (new URLSearchParams(window.location.search).has("calibrate")) return;

    const rec = readConsent();
    if (rec) setChoice({ analytics: rec.analytics, maps: rec.maps });
    // Small delay so the banner glides in after the page has settled.
    const t = setTimeout(() => {
      if (!readConsent()) setPanel("banner");
    }, 900);

    const open = () => {
      const cur = readConsent();
      setChoice(cur ? { analytics: cur.analytics, maps: cur.maps } : CONSENT_DENIED);
      setPanel("settings");
    };
    // A decision persisted anywhere (e.g. enabling the map on /kontakt) dismisses
    // the banner too — the visitor has now chosen, so it should stop nagging.
    const dismissOnDecision = () => setPanel("none");
    window.addEventListener(CONSENT_OPEN, open);
    window.addEventListener(CONSENT_CHANGED, dismissOnDecision);
    return () => {
      clearTimeout(t);
      window.removeEventListener(CONSENT_OPEN, open);
      window.removeEventListener(CONSENT_CHANGED, dismissOnDecision);
    };
  }, []);

  const commit = (value: ConsentValue) => {
    saveConsent(value);
    setPanel("none");
  };

  if (panel === "none") return null;

  if (panel === "settings") {
    return (
      <div className="cc-overlay" role="dialog" aria-modal="true" aria-label="Nastavenia cookies">
        <div className="cc-modal">
          <p className="annot cc-eyebrow">SÚKROMIE</p>
          <h2 className="cc-title">Nastavenia cookies</h2>
          <p className="cc-lead">
            Vyberte, čo môžeme používať. Svoju voľbu môžete kedykoľvek zmeniť.
            Podrobnosti nájdete v{" "}
            <Link href="/cookies" className="cc-link" onClick={() => setPanel("none")}>
              Zásadách používania cookies
            </Link>
            .
          </p>

          <div className="cc-rows">
            {CATEGORIES.map((c) => {
              const on = c.locked ? true : choice[c.key as "analytics" | "maps"];
              return (
                <div key={c.key} className="cc-row">
                  <div className="cc-row-head">
                    <span className="cc-row-title">{c.title}</span>
                    {c.locked ? (
                      <span className="cc-always">Vždy aktívne</span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={c.title}
                        className="cc-switch"
                        data-on={on}
                        onClick={() =>
                          setChoice((p) => ({ ...p, [c.key]: !p[c.key as "analytics" | "maps"] }))
                        }
                      >
                        <span className="cc-knob" />
                      </button>
                    )}
                  </div>
                  <p className="cc-row-body">{c.body}</p>
                </div>
              );
            })}
          </div>

          <div className="cc-actions">
            <button className="cc-btn cc-btn--ghost" onClick={() => commit(CONSENT_DENIED)}>
              Odmietnuť nepovinné
            </button>
            <button className="cc-btn cc-btn--ghost" onClick={() => commit(choice)}>
              Uložiť voľbu
            </button>
            <button className="cc-btn cc-btn--primary" onClick={() => commit(CONSENT_GRANTED)}>
              Prijať všetko
            </button>
          </div>
        </div>
      </div>
    );
  }

  // banner
  return (
    <div className="cc-banner" role="dialog" aria-live="polite" aria-label="Súhlas s cookies">
      <div className="cc-banner-in">
        <div className="cc-banner-text">
          <p className="cc-banner-title">Vážime si vaše súkromie</p>
          <p className="cc-banner-body">
            Používame nevyhnutné cookies, aby web fungoval. S vaším súhlasom aj
            cookies pre mapy a prípadné meranie návštevnosti. Viac v{" "}
            <Link href="/cookies" className="cc-link" onClick={() => setPanel("none")}>
              Zásadách používania cookies
            </Link>{" "}
            a{" "}
            <Link href="/ochrana-osobnych-udajov" className="cc-link" onClick={() => setPanel("none")}>
              Ochrane osobných údajov
            </Link>
            .
          </p>
        </div>
        <div className="cc-banner-btns">
          <button className="cc-btn cc-btn--ghost" onClick={() => setPanel("settings")}>
            Nastavenia
          </button>
          <button className="cc-btn cc-btn--ghost" onClick={() => commit(CONSENT_DENIED)}>
            Odmietnuť
          </button>
          <button className="cc-btn cc-btn--primary" onClick={() => commit(CONSENT_GRANTED)}>
            Prijať všetko
          </button>
        </div>
      </div>
    </div>
  );
}
