"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import ResidenceGallery from "@/components/offer/ResidenceGallery";
import ApartmentTable from "@/components/offer/ApartmentTable";
import BuildingInteractive from "@/components/sections/BuildingInteractive";
import FinancingCTA from "@/components/sections/FinancingCTA";
import {
  apartmentsFor,
  buildFloors,
  FLOOR_DATA,
  FLOOR_GEOMETRY,
  plural,
} from "@/lib/building";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

const FLATS = buildFloors(FLOOR_GEOMETRY).flatMap(apartmentsFor);
const FREE = FLATS.filter((a) => a.stav === "Voľný").length;
const PRICE_FROM = Math.min(...FLATS.map((a) => Number(a.cena.replace(/[^\d]/g, ""))));
const STATS = [
  { n: String(FLATS.length), l: "bytov" },
  { n: String(FLOOR_DATA.length), l: "podlažia" },
  { n: String(FREE), l: plural(FREE, "voľný", "voľné", "voľných") },
  { n: PRICE_FROM.toLocaleString("sk-SK"), l: "€ od", small: true },
];

function Header() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.fromTo(".oh-rise", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.1, ease: "power3.out" });
      tl.fromTo(".oh-stat", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out" }, 0.5);
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="relative w-full overflow-hidden" style={{ backgroundColor: "#181913" }}>
      <div className="oh-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="mx-auto max-w-[1400px] px-[6%] pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="oh-rise"><SheetRef label="Anima Residences · Nitra" /></div>
        <h1
          className="oh-rise mt-7"
          style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(46px, 9vw, 128px)", fontWeight: 300, lineHeight: 0.98, letterSpacing: "-0.015em", color: STONE }}
        >
          Ponuka bytov
        </h1>
        <p
          className="oh-rise mt-8 max-w-[540px]"
          style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, fontWeight: 300, lineHeight: 2, letterSpacing: "0.01em", color: "rgba(242,237,230,0.66)" }}
        >
          Jedenásť bytov v štyroch podlažiach — od tichých dvojizbových po priechodné
          trojizbové s loggiou do zelene. Vyberte si podlažie na fasáde, prejdite si
          pôdorysy a porovnajte ceny v prehľadnom cenníku.
        </p>

        <div className="mt-14 grid max-w-[720px] grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="oh-stat" style={{ borderTop: "1px solid rgba(182,154,120,0.28)", paddingTop: 14 }}>
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: s.small ? "clamp(26px,3vw,38px)" : "clamp(34px,4vw,52px)", fontWeight: 300, lineHeight: 1, color: STONE }}>
                {s.n}
              </p>
              <p className="annot mt-2" style={{ fontSize: 9, color: GOLD }}>{s.l.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function OfferPage() {
  return (
    <>
      <Header />
      <ResidenceGallery />
      <BuildingInteractive />
      <ApartmentTable />
      <FinancingCTA />
    </>
  );
}
