"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArchMark, SheetRef } from "@/components/ui/brand";
import HypoCalc from "@/components/financing/HypoCalc";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";
const CHARCOAL = "#1C1C1A";

const BENEFITS = [
  { t: "Výhodné sadzby", d: "Porovnáme ponuky partnerských bánk a vyberieme najlepšiu." },
  { t: "Bezpečné vybavenie", d: "Zmluvy aj papierovanie ustrážime za vás." },
  { t: "Osobný prístup", d: "Jeden poradca, ktorý vás prevedie celým procesom." },
  { t: "Rýchle vybavenie", d: "Od žiadosti k schváleniu bez zbytočného čakania." },
];

const STEPS = [
  { no: "01", t: "Konzultácia", d: "Nezáväzné stretnutie s poradcom. Prejdeme vaše možnosti a odpovieme na otázky. Prvá konzultácia je vždy zdarma." },
  { no: "02", t: "Analýza", d: "Poradca zhodnotí vašu situáciu a pripraví návrh optimálneho riešenia na mieru." },
  { no: "03", t: "Žiadosť", d: "Podáme žiadosť o hypotéku vo vybranej banke a postrážime všetky podklady." },
  { no: "04", t: "Schválenie", d: "Banka úver schváli, podpíšete zmluvu — a kľúče od nového domova sú bližšie." },
];

export default function FinancingPage() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".rise").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%" } }
        );
      });
      gsap.utils.toArray<HTMLElement>(".rule-x").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } }
        );
      });
    },
    { scope: root }
  );

  return (
    <div ref={root}>
      {/* ── Hero ── */}
      <section style={{ backgroundColor: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] pb-24 pt-32 md:pb-28 md:pt-44">
          <Link
            href="/"
            className="rise annot inline-flex items-center gap-2 transition-colors duration-300 hover:text-gold"
            style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}
          >
            <span aria-hidden>←</span> SPÄŤ NA ANIMA RESIDENCES
          </Link>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="rise">
                <SheetRef label="Financovanie" />
              </div>
              <h1
                className="rise mt-8"
                style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(48px, 8vw, 120px)", fontWeight: 300, lineHeight: 0.98, letterSpacing: "-0.02em", color: STONE }}
              >
                Financovanie
                <br />
                <span style={{ color: "rgba(242,237,230,0.45)" }}>na mieru</span>
              </h1>
            </div>

            <p
              className="rise max-w-[440px] lg:justify-self-end"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(242,237,230,0.68)" }}
            >
              Kúpa bytu je veľké rozhodnutie — financovanie by nemalo byť to, čo
              vás na ňom stresuje. Prepojíme vás s poradcom, ktorý porovná ponuky
              partnerských bánk, vybaví papierovanie a nájde splátku, ktorá vám
              sadne. Vy sa môžete tešiť na nový domov.
            </p>
          </div>

          {/* benefits */}
          <div className="rule-x mt-20 h-px w-full" style={{ backgroundColor: "rgba(242,237,230,0.15)" }} />
          <ul className="mt-4 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <li key={b.t} className="rise flex flex-col gap-3 py-10" style={{ borderTop: "0" }}>
                <ArchMark size={16} color={GOLD} />
                <h3 className="mt-2" style={{ fontFamily: "var(--font-cormorant)", fontSize: "23px", fontWeight: 300, color: STONE }}>
                  {b.t}
                </h3>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
                  {b.d}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Proces ── */}
      <section style={{ backgroundColor: "#F2EDE6", color: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-28 md:py-40">
          <div className="rise">
            <SheetRef label="Ako to prebieha" color="rgba(28,28,26,0.5)" />
          </div>
          <h2
            className="rise mt-8 max-w-[760px]"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 4.4vw, 64px)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.01em" }}
          >
            Štyri kroky k vlastnému bývaniu
          </h2>

          <div className="rule-x mt-16 h-px w-full" style={{ backgroundColor: "rgba(28,28,26,0.15)" }} />
          <div className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.no} className="rise flex flex-col py-12" style={{ borderTop: "1px solid rgba(28,28,26,0.12)" }}>
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "48px", fontWeight: 300, lineHeight: 1, color: GOLD }}>
                  {s.no}
                </span>
                <h3 className="mt-6" style={{ fontFamily: "var(--font-cormorant)", fontSize: "26px", fontWeight: 300 }}>
                  {s.t}
                </h3>
                <p className="mt-3" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12.5px", fontWeight: 300, lineHeight: 1.8, color: "rgba(28,28,26,0.68)" }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kalkulačka ── */}
      <section style={{ backgroundColor: "#141510" }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-28 md:py-40">
          <div className="rise flex items-baseline justify-between">
            <SheetRef label="Hypokalkulačka" />
            <span className="annot" style={{ fontSize: "10px", color: "rgba(242,237,230,0.4)" }}>
              ORIENTAČNE
            </span>
          </div>
          <h2
            className="rise mt-8 max-w-[760px]"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 4.4vw, 64px)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.01em", color: STONE }}
          >
            Spočítajte si mesačnú splátku
          </h2>

          <div className="rise mt-16">
            <HypoCalc />
          </div>
        </div>
      </section>

      {/* ── Poradca ── */}
      <section style={{ backgroundColor: "#F2EDE6", color: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-28 md:py-40">
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="rise">
                <SheetRef label="Váš poradca" color="rgba(28,28,26,0.5)" />
              </div>
              <h2
                className="rise mt-8"
                style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 4.4vw, 60px)", fontWeight: 300, lineHeight: 1.06, letterSpacing: "-0.01em" }}
              >
                Prvá konzultácia
                <br />
                <span style={{ color: "rgba(28,28,26,0.45)" }}>je vždy zdarma.</span>
              </h2>
              <p
                className="rise mt-8 max-w-[420px]"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, lineHeight: 2.1, color: "rgba(28,28,26,0.7)" }}
              >
                Napíšte nám a spojíme vás s poradcom, ktorý sa financovaniu Anima
                Residences venuje. Nezáväzne, bez tlaku a bez záväzkov.
              </p>
            </div>

            {/* advisor card */}
            <div
              className="rise flex flex-col p-10 md:p-12"
              style={{ background: CHARCOAL, color: STONE }}
            >
              <div className="flex items-center justify-between">
                <ArchMark size={22} color={GOLD} />
                <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.4)" }}>
                  PORADENSTVO
                </span>
              </div>

              <p className="mt-8" style={{ fontFamily: "var(--font-cormorant)", fontSize: "34px", fontWeight: 300, lineHeight: 1.1 }}>
                Poradca pre financovanie
              </p>

              <dl className="mt-10 space-y-5 border-t pt-8" style={{ borderColor: "rgba(242,237,230,0.15)" }}>
                <AdvisorRow label="E-mail" value="financovanie@animaresidences.sk" />
                <AdvisorRow label="Telefón" value="+421 900 000 000" />
                <AdvisorRow label="Dostupnosť" value="Po – Pia · 8:00 – 17:00" />
              </dl>

              <a
                href="mailto:financovanie@animaresidences.sk"
                className="group mt-10 inline-flex items-center justify-center gap-4"
                style={{ background: GOLD, color: CHARCOAL, padding: "18px 0" }}
              >
                <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>
                  DOHODNÚŤ KONZULTÁCIU
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "15px" }}>
                  →
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function AdvisorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.45)" }}>
        {label.toUpperCase()}
      </dt>
      <dd style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, color: STONE, textAlign: "right" }}>
        {value}
      </dd>
    </div>
  );
}
