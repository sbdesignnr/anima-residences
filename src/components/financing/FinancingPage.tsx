"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import HypoCalc from "@/components/financing/HypoCalc";
import { COMPANY } from "@/components/ui/Footer";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STONE = "#F2EDE6";
const CHARCOAL = "#1C1C1A";

/**
 * The process, as DURATIONS.
 *
 * It used to be four cards numbered 01–04, which is the shape every template on
 * earth arrives in and which says nothing: everybody already knows a mortgage has
 * steps. What nobody tells you is HOW LONG each one takes — and that is the only
 * thing somebody deciding whether to start actually wants to know. So the numeral
 * is gone and the clock is the headline.
 */
const STEPS = [
  {
    t: "Konzultácia",
    when: "1 stretnutie",
    d: "Prejdeme príjem, výdavky a to, na čo reálne dosiahnete.",
  },
  {
    t: "Výber banky",
    when: "2 – 3 dni",
    d: "Poradca porovná ponuky partnerských bánk a prinesie tú, ktorá vychádza najlepšie pre vás. Nie tú, ktorá platí najlepšiu províziu jemu.",
  },
  {
    t: "Žiadosť a znalecký posudok",
    when: "1 – 2 týždne",
    d: "Podklady, posudok, žiadosť. Papierovanie ustrážime my; vy prídete podpísať.",
  },
  {
    t: "Schválenie a čerpanie",
    when: "2 – 4 týždne",
    d: "Banka úver schváli a peniaze idú predávajúcemu. Odvtedy platíte splátku namiesto nájmu.",
  },
];

/** Three claims we can stand behind — not four adjectives with an icon over them. */
const TRUTHS: [string, string][] = [
  ["Prvá konzultácia je zdarma", "A zostane zdarma aj vtedy, keď si nakoniec byt nekúpite."],
  ["Porovnáme banky, nie jednu banku", "Poradca nepracuje pre banku, ale pre vás — a preto smie povedať aj „toto si neberte“."],
  ["Papierovanie ide mimo vás", "Podklady, znalecký posudok, komunikácia s bankou. Vy prídete podpísať."],
];

export default function FinancingPage() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".fp-rise").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } }
        );
      });
      gsap.utils.toArray<HTMLElement>(".fp-rule").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 94%" } }
        );
      });
      // The rail draws itself down through the steps as they are read.
      gsap.fromTo(
        ".fp-rail-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          transformOrigin: "top center",
          ease: "none",
          scrollTrigger: { trigger: ".fp-rail", start: "top 74%", end: "bottom 80%", scrub: 0.6 },
        }
      );
    },
    { scope: root }
  );

  return (
    <div ref={root}>
      {/* ── The question ── */}
      <section style={{ backgroundColor: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] pb-20 pt-32 md:pb-24 md:pt-44">
          <Link
            href="/"
            className="fp-rise annot inline-flex items-center gap-2 transition-colors duration-300 hover:text-gold"
            style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}
          >
            <span aria-hidden>←</span> SPÄŤ NA ANIMA RESIDENCES
          </Link>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="fp-rise">
                <SheetRef label="Financovanie" />
              </div>
              <h1
                className="fp-rise mt-8"
                style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(42px, 6.6vw, 100px)", fontWeight: 300, lineHeight: 1.02, letterSpacing: "-0.02em", color: STONE }}
              >
                Koľko ma to bude
                <br />
                <span style={{ color: "rgba(242,237,230,0.45)" }}>stáť mesačne?</span>
              </h1>
            </div>

            <p
              className="fp-rise max-w-[430px] lg:justify-self-end"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(242,237,230,0.68)" }}
            >
              To je jediná otázka, na ktorej naozaj záleží. A odpoveď na ňu
              nezávisí od nejakej abstraktnej „výšky úveru“ — závisí od toho,
              ktorý byt sa vám páči. Tak si ho vyberte.
            </p>
          </div>
        </div>
      </section>

      {/* ── The answer ── */}
      <section id="kalkulacka" style={{ backgroundColor: "#141510" }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
          <div className="fp-rule h-px w-full" style={{ backgroundColor: "rgba(242,237,230,0.14)" }} />
          <div className="fp-rise mt-12">
            <HypoCalc />
          </div>

          <p className="annot mt-16 max-w-[760px]" style={{ fontSize: "9px", lineHeight: 2.4, color: "rgba(242,237,230,0.32)" }}>
            ORIENTAČNÝ PREPOČET. NEJDE O PONUKU ANI O PRÍSĽUB ÚVERU — SKUTOČNÚ SADZBU
            A SPLÁTKU URČÍ BANKA PODĽA VAŠEJ SITUÁCIE.
          </p>
        </div>
      </section>

      {/* ── How long it takes ── */}
      <section style={{ backgroundColor: "#F2EDE6", color: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="fp-rise">
                <SheetRef label="Ako to prebieha" color="rgba(28,28,26,0.5)" />
              </div>
              <h2
                className="fp-rise mt-8 max-w-[800px]"
                style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 4vw, 58px)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.01em" }}
              >
                Od prvého stretnutia po kľúče
                <br />
                <span style={{ color: "rgba(28,28,26,0.45)" }}>je to zhruba mesiac a pol.</span>
              </h2>
            </div>
            <p
              className="fp-rise max-w-[400px] lg:justify-self-end"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12.5px", fontWeight: 300, lineHeight: 2, color: "rgba(28,28,26,0.68)" }}
            >
              Že hypotéka má kroky, viete aj bez nás. Nikto vám však nepovie, ako
              dlho trvajú — a pritom je to jediné, čo pri rozhodovaní, či do toho
              vôbec ísť, naozaj potrebujete vedieť.
            </p>
          </div>

          <ol className="fp-rail mt-16">
            <span className="fp-rail-line" aria-hidden>
              <span className="fp-rail-fill" />
            </span>

            {STEPS.map((s) => (
              <li key={s.t} className="fp-step fp-rise">
                <span className="fp-node" aria-hidden />
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <h3 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(23px, 2.3vw, 31px)", fontWeight: 300, lineHeight: 1.15 }}>
                      {s.t}
                    </h3>
                    <span className="fp-when">{s.when}</span>
                  </div>
                  <p
                    className="mt-3 max-w-[560px]"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12.5px", fontWeight: 300, lineHeight: 1.95, color: "rgba(28,28,26,0.68)" }}
                  >
                    {s.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Why through an adviser ── */}
      <section style={{ backgroundColor: CHARCOAL, color: STONE }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
          <div className="fp-rise">
            <SheetRef label="Prečo cez poradcu" />
          </div>

          <div className="fp-rule mt-10 h-px w-full" style={{ backgroundColor: "rgba(242,237,230,0.14)" }} />

          <ul className="mt-2">
            {TRUTHS.map(([head, body]) => (
              <li
                key={head}
                className="fp-rise grid gap-3 py-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
                style={{ borderBottom: "1px solid rgba(242,237,230,0.1)" }}
              >
                <h3 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(22px, 2.2vw, 30px)", fontWeight: 300, lineHeight: 1.25 }}>
                  {head}
                </h3>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 2, color: "rgba(242,237,230,0.62)" }}>
                  {body}
                </p>
              </li>
            ))}
          </ul>

          <div className="fp-rise mt-16 flex flex-col gap-9 lg:flex-row lg:items-center lg:justify-between">
            <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(23px, 2.5vw, 33px)", fontWeight: 300, lineHeight: 1.35, color: STONE }}>
              Prvá konzultácia je zdarma.
              <span style={{ color: "rgba(242,237,230,0.45)" }}> Aj tá, po ktorej si to rozmyslíte.</span>
            </p>

            <div className="flex flex-wrap items-center gap-8">
              <a href={`tel:${COMPANY.phoneHref}`} className="fp-phone">
                {COMPANY.phone}
              </a>
              <Link href="/kontakt" className="fp-cta group">
                <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>DOHODNÚŤ KONZULTÁCIU</span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)" }}>
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
