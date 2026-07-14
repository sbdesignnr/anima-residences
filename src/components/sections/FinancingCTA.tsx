"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

const BENEFITS = [
  { k: "Výhodné sadzby", v: "od partnerských bánk" },
  { k: "Osobný prístup", v: "poradca len pre vás" },
  { k: "Bezpečné vybavenie", v: "papierovanie za vás" },
  { k: "Prvá konzultácia", v: "vždy zdarma" },
];

/* ── The estimate ──────────────────────────────────────────────────────────
 * Deliberately a TEASER, not a calculator. One handle, three fixed assumptions,
 * printed openly underneath — anything more belongs on /financovanie, where the
 * real thing lives. The numbers below are indicative and the client should
 * confirm the rate against a current bank offer.
 */
const PRICE = 198_000;  // 3NP — the typical apartment
const RATE = 0.042;     // p.a.
const YEARS = 30;

const monthlyFor = (ownPct: number) => {
  const principal = PRICE * (1 - ownPct / 100);
  const r = RATE / 12;
  const n = YEARS * 12;
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -n)));
};

const eur = (n: number) => n.toLocaleString("sk-SK");

/**
 * The arch as a vessel.
 *
 * A pie chart would say the same thing and belong to no one. This is the mark's
 * own arch, filled from the footing up: what the bank lends is the part that is
 * full, what you bring is the air above it. Drag the handle and the level moves,
 * which is the whole idea made physical.
 */
const ARCH = "M22 250 V96 a78 78 0 0 1 156 0 V250 Z";

export default function FinancingCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const arcsRef = useRef<SVGSVGElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const payRef = useRef<HTMLSpanElement>(null);
  const loanRef = useRef<HTMLSpanElement>(null);
  const ownRef = useRef<HTMLSpanElement>(null);

  const [own, setOwn] = useState(20);
  const loanShare = 1 - own / 100;

  /* Entrance. */
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const enter = { trigger: sectionRef.current, start: "top 72%" };

      gsap.fromTo(
        ".fin-reveal",
        { yPercent: 120, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: "power3.out", scrollTrigger: enter }
      );
      gsap.fromTo(
        ".fin-benefit",
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 60%" },
        }
      );

      /* The vessel: its outline is drawn, then it fills. */
      gsap.fromTo(
        ".fin-ink",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 1.6, stagger: 0.08, ease: "power2.inOut", scrollTrigger: enter }
      );
      gsap.fromTo(
        fillRef.current,
        { attr: { y: 250 }, opacity: 0 },
        {
          attr: { y: 250 - 250 * loanShare },
          opacity: 1,
          duration: 1.5,
          delay: 0.5,
          ease: "power2.inOut",
          scrollTrigger: enter,
        }
      );

      if (reduce) return;
      gsap.to(arcsRef.current, {
        rotate: -24,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.4 },
      });
    },
    { scope: sectionRef }
  );

  /* The handle moves: the level follows it and the figures count to the answer. */
  const settled = useRef(false);
  useEffect(() => {
    const ctx = gsap.context(() => {
      // On mount the arch is still empty and the entrance tween owns the pour.
      // Filling it here as well would race that tween and the level would jump.
      if (!settled.current) {
        settled.current = true;
        return;
      }

      gsap.to(fillRef.current, {
        attr: { y: 250 - 250 * loanShare },
        duration: 0.7,
        ease: "power3.out",
      });

      const count = (el: HTMLSpanElement | null, to: number, step: number) => {
        if (!el) return;
        const from = Number(el.dataset.v ?? to);
        const p = { v: from };
        gsap.to(p, {
          v: to,
          duration: 0.7,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = eur(Math.round(p.v / step) * step);
          },
          onComplete: () => {
            el.dataset.v = String(to);
            el.textContent = eur(to);
          },
        });
      };

      count(payRef.current, monthlyFor(own), 1);
      count(loanRef.current, Math.round(PRICE * loanShare), 100);
      count(ownRef.current, Math.round(PRICE * (own / 100)), 100);
    }, sectionRef);
    return () => ctx.revert();
  }, [own, loanShare]);

  return (
    <section
      ref={sectionRef}
      id="financovanie-cta"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#141510", color: STONE }}
    >
      {/* ── The ground it stands on: a fine rule grid, great brass arcs turning
             behind, and a warm floor glow low to the right. ── */}
      <div className="fin-grid" aria-hidden />
      <svg ref={arcsRef} className="fin-arcs" viewBox="0 0 600 600" fill="none" aria-hidden>
        <circle cx="300" cy="300" r="140" stroke={GOLD} strokeOpacity="0.20" />
        <circle cx="300" cy="300" r="216" stroke={GOLD} strokeOpacity="0.13" />
        <circle cx="300" cy="300" r="292" stroke={GOLD} strokeOpacity="0.08" />
        <path d="M300 4 V596 M4 300 H596" stroke={GOLD} strokeOpacity="0.07" />
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 85% 110%, rgba(182,154,120,0.17) 0%, rgba(182,154,120,0) 55%)" }}
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-16 px-[6%] py-28 md:py-40 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── copy ── */}
        <div>
          <div style={{ overflow: "hidden" }}>
            <div className="fin-reveal">
              <SheetRef label="Financovanie" />
            </div>
          </div>

          <h2
            className="mt-8"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(38px, 5.4vw, 84px)", fontWeight: 300, lineHeight: 1.02, letterSpacing: "-0.015em" }}
          >
            <span style={{ display: "block", overflow: "hidden" }}>
              <span className="fin-reveal" style={{ display: "block" }}>Financovanie,</span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span className="fin-reveal" style={{ display: "block", color: "rgba(242,237,230,0.5)" }}>ktoré vám sadne.</span>
            </span>
          </h2>

          <div style={{ overflow: "hidden" }}>
            <p
              className="fin-reveal mt-8 max-w-[480px]"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(242,237,230,0.68)" }}
            >
              Nemusíte to riešiť sami. Poradca vám porovná ponuky partnerských
              bánk, vybaví papierovanie a nájde splátku, ktorá dáva zmysel — prvá
              konzultácia je vždy nezáväzná a zdarma.
            </p>
          </div>

          <ul className="mt-12 grid max-w-[520px] grid-cols-2 gap-x-10 gap-y-7">
            {BENEFITS.map((b) => (
              <li key={b.k} className="fin-benefit flex items-start gap-3">
                <span
                  aria-hidden
                  style={{ display: "block", width: 7, height: 9, marginTop: 5, flexShrink: 0, borderRadius: "3.5px 3.5px 0 0", border: `1px solid ${GOLD}` }}
                />
                <span>
                  <span className="block" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12.5px", fontWeight: 400, color: STONE }}>
                    {b.k}
                  </span>
                  <span className="block" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: "rgba(242,237,230,0.45)", marginTop: 2 }}>
                    {b.v}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* Desktop: the ask sits under the argument, beside the vessel. */}
          <div className="hidden lg:block">
            <Cta />
          </div>
        </div>

        {/* ── the vessel ── */}
        <div className="fin-vessel">
          <div className="flex items-baseline justify-between">
            <span className="annot" style={{ fontSize: "10px", color: GOLD }}>
              MESAČNE OD
            </span>
            <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.38)" }}>
              ORIENTAČNE
            </span>
          </div>

          <p className="mt-3 flex items-baseline gap-2" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 300, color: STONE }}>
            <span ref={payRef} data-v={monthlyFor(20)} style={{ fontSize: "clamp(46px, 5vw, 68px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {eur(monthlyFor(20))}
            </span>
            <span style={{ fontSize: "26px", color: "rgba(242,237,230,0.55)" }}>€</span>
          </p>

          <div className="mt-8 flex items-center gap-9">
            {/* the arch, filling */}
            <svg className="fin-arch" viewBox="0 0 200 268" fill="none" aria-hidden>
              <defs>
                <clipPath id="finArchClip">
                  <path d={ARCH} />
                </clipPath>
                {/* The surface line is the gradient's first stop, not a second
                    element: the gradient is measured against the rect's own box,
                    so it rides the level for free instead of needing its own
                    tween kept in lockstep with it. */}
                <linearGradient id="finFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F6E6BD" stopOpacity="0.95" />
                  <stop offset="1.4%" stopColor="#D8BB87" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#B69A78" stopOpacity="0.12" />
                </linearGradient>
              </defs>

              {/* what the bank lends, poured in from the footing */}
              <g clipPath="url(#finArchClip)">
                <rect ref={fillRef} x="0" y="250" width="200" height="260" fill="url(#finFill)" />
              </g>

              {/* The vessel's outline, and its scale. The scale is struck on the
                  OUTSIDE: inside, it sat under the pour and the marks the level
                  is meant to be read against were the ones the level hid. */}
              <path className="fin-ink" d={ARCH} pathLength={1} stroke={GOLD} strokeWidth="1.2" fill="none" />
              {[0.25, 0.5, 0.75].map((t) => (
                <path
                  key={t}
                  className="fin-ink"
                  d={`M2 ${250 - 250 * t} H16`}
                  pathLength={1}
                  stroke={GOLD}
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              ))}
              <path className="fin-ink" d="M6 258 H194" pathLength={1} stroke={GOLD} strokeOpacity="0.5" strokeWidth="1" />
            </svg>

            {/* the split, in figures */}
            <dl className="flex-1">
              <Figure label="HYPOTÉKA" tone={GOLD}>
                <span ref={loanRef} data-v={Math.round(PRICE * 0.8)}>{eur(Math.round(PRICE * 0.8))}</span> €
              </Figure>
              <Figure label="VLASTNÉ ZDROJE" tone="rgba(242,237,230,0.75)">
                <span ref={ownRef} data-v={Math.round(PRICE * 0.2)}>{eur(Math.round(PRICE * 0.2))}</span> €
              </Figure>
            </dl>
          </div>

          {/* the one handle */}
          <label className="mt-9 block">
            <span className="flex items-baseline justify-between">
              <span className="annot" style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}>
                VLASTNÉ ZDROJE
              </span>
              <span className="annot" style={{ fontSize: "12px", color: STONE, fontVariantNumeric: "tabular-nums" }}>
                {own} %
              </span>
            </span>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={own}
              onChange={(e) => setOwn(Number(e.target.value))}
              className="hypo-range mt-4 w-full"
              aria-label="Podiel vlastných zdrojov"
              style={{
                background: `linear-gradient(to right, ${GOLD} 0%, ${GOLD} ${((own - 10) / 40) * 100}%, rgba(242,237,230,0.16) ${((own - 10) / 40) * 100}%, rgba(242,237,230,0.16) 100%)`,
              }}
            />
          </label>

          <p className="annot mt-6" style={{ fontSize: "9px", lineHeight: 2, color: "rgba(242,237,230,0.4)" }}>
            BYT ZA {eur(PRICE)} € · {(RATE * 100).toFixed(1).replace(".", ",")} % P.A. · {YEARS} ROKOV
          </p>
        </div>

        {/* Phone: the column collapses, so the ask has to come AFTER the thing
            that does the persuading — not above it. */}
        <div className="lg:hidden">
          <Cta />
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <div style={{ overflow: "hidden" }}>
      <Link
        href="/financovanie"
        className="fin-reveal group mt-4 inline-flex items-center gap-5 lg:mt-14"
        style={{ background: GOLD, color: "#141510", padding: "18px 30px" }}
      >
        <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>
          MOŽNOSTI FINANCOVANIA
        </span>
        <span
          aria-hidden
          className="transition-transform duration-300 group-hover:translate-x-1"
          style={{ fontFamily: "var(--font-dm-sans)", fontSize: "15px" }}
        >
          →
        </span>
      </Link>
    </div>
  );
}

function Figure({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="py-4" style={{ borderTop: "1px solid rgba(242,237,230,0.14)" }}>
      <dt className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.45)" }}>
        {label}
      </dt>
      <dd
        className="mt-1.5"
        style={{ fontFamily: "var(--font-cormorant)", fontSize: "25px", fontWeight: 300, color: tone, fontVariantNumeric: "tabular-nums" }}
      >
        {children}
      </dd>
    </div>
  );
}
