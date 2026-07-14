"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import { apartmentsFor, buildFloors, FLOOR_GEOMETRY } from "@/lib/building";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

/* The same assumptions the full calculator opens with, so the two never disagree. */
const RATE = 4.2;
const YEARS = 30;
const OWN = 0.2;

const monthly = (P: number) => {
  const r = RATE / 100 / 12;
  const n = YEARS * 12;
  return (P * r) / (1 - Math.pow(1 + r, -n));
};
const eur = (n: number) => Math.round(n).toLocaleString("sk-SK");

/**
 * The home page's financing ask.
 *
 * It does not repeat the calculator — it answers ONE question with a real number
 * off the real price list ("the cheapest flat still for sale costs you this much
 * a month"), and hands the rest to /financovanie. A second calculator here would
 * be a second thing to maintain and a second place for the figures to drift.
 */
export default function FinancingCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const payRef = useRef<HTMLSpanElement>(null);

  const flats = useMemo(() => buildFloors(FLOOR_GEOMETRY).flatMap(apartmentsFor), []);
  const cheapest = useMemo(() => {
    const price = (a: (typeof flats)[number]) => Number(a.cena.replace(/[^\d]/g, ""));
    const free = flats.filter((a) => a.stav === "Voľný");
    return (free.length ? free : flats).reduce((a, b) => (price(a) <= price(b) ? a : b));
  }, [flats]);

  const price = Number(cheapest.cena.replace(/[^\d]/g, ""));
  const pay = monthly(price * (1 - OWN));
  const [shown, setShown] = useState(false);

  useGSAP(
    () => {
      const enter = { trigger: sectionRef.current, start: "top 72%" };
      gsap.fromTo(
        ".fx-reveal",
        { yPercent: 120, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: "power3.out", scrollTrigger: enter }
      );
      gsap.fromTo(
        ".fx-fact",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 58%" } }
      );
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 62%",
        once: true,
        onEnter: () => setShown(true),
      });
    },
    { scope: sectionRef }
  );

  /* The figure counts up once, when it is first read. */
  useEffect(() => {
    const el = payRef.current;
    if (!shown || !el) return;
    const p = { v: 0 };
    const t = gsap.to(p, {
      v: pay,
      duration: 1.3,
      ease: "power2.out",
      onUpdate: () => (el.textContent = eur(p.v)),
      onComplete: () => (el.textContent = eur(pay)),
    });
    return () => {
      t.kill();
    };
  }, [shown, pay]);

  return (
    <section
      ref={sectionRef}
      id="financovanie-cta"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#141510", color: STONE }}
    >
      <div className="fin-grid" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(110% 85% at 88% 108%, rgba(182,154,120,0.16) 0%, rgba(182,154,120,0) 56%)" }}
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-16 px-[6%] py-28 md:py-40 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── the argument ── */}
        <div>
          <div style={{ overflow: "hidden" }}>
            <div className="fx-reveal">
              <SheetRef label="Financovanie" />
            </div>
          </div>

          <h2
            className="mt-8"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(36px, 5.2vw, 80px)", fontWeight: 300, lineHeight: 1.02, letterSpacing: "-0.015em" }}
          >
            <span style={{ display: "block", overflow: "hidden" }}>
              <span className="fx-reveal" style={{ display: "block" }}>Menej, než dnes</span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span className="fx-reveal" style={{ display: "block", color: "rgba(242,237,230,0.5)" }}>platíte za nájom.</span>
            </span>
          </h2>

          <div style={{ overflow: "hidden" }}>
            <p
              className="fx-reveal mt-8 max-w-[470px]"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(242,237,230,0.68)" }}
            >
              Poradca porovná ponuky partnerských bánk, vybaví papierovanie a nájde
              splátku, ktorá dáva zmysel. Prvá konzultácia je nezáväzná a zdarma —
              aj tá, po ktorej si to rozmyslíte.
            </p>
          </div>

          <ul className="mt-11 flex flex-wrap gap-x-10 gap-y-4">
            {["Prvá konzultácia zdarma", "Porovnáme banky, nie jednu", "Papierovanie ide mimo vás"].map((t) => (
              <li key={t} className="fx-fact flex items-start gap-3">
                <span
                  aria-hidden
                  style={{ display: "block", width: 7, height: 9, marginTop: 4, flexShrink: 0, borderRadius: "3.5px 3.5px 0 0", border: `1px solid ${GOLD}` }}
                />
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12.5px", fontWeight: 300, color: "rgba(242,237,230,0.78)" }}>
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── the number ── */}
        <div className="fx-plate">
          <div className="flex items-baseline justify-between gap-6">
            <span className="annot" style={{ fontSize: "10px", color: GOLD }}>UŽ OD</span>
            <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.35)" }}>ORIENTAČNE</span>
          </div>

          <p className="mt-3 flex flex-wrap items-baseline gap-x-3" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 300, color: STONE }}>
            <span ref={payRef} style={{ fontSize: "clamp(52px, 6vw, 86px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {eur(pay)}
            </span>
            <span style={{ fontSize: "26px", color: "rgba(242,237,230,0.5)" }}>€ / mesiac</span>
          </p>

          <p className="annot mt-5" style={{ fontSize: "9px", lineHeight: 2.1, color: "rgba(242,237,230,0.42)" }}>
            BYT {cheapest.id} · {cheapest.vymera.toUpperCase()} · {eur(price)} €
            <br />
            PRI {OWN * 100} % VLASTNÝCH ZDROJOV · {RATE.toFixed(1).replace(".", ",")} % P. A. · {YEARS} ROKOV
          </p>

          <div className="mt-9 h-px w-full" style={{ background: "rgba(242,237,230,0.14)" }} />

          <Link href="/financovanie" className="fx-cta group mt-9">
            <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>SPOČÍTAŤ PRE MÔJ BYT</span>
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "15px" }}>
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
