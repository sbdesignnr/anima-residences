"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import LocationOrbit from "@/components/lokalita/LocationOrbit";
import { CONNECTIONS, POIS } from "@/lib/lokalita";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

const WALK15 = POIS.filter((p) => p.walk <= 15).length;
const STATS = [
  { n: String(WALK15), l: "miest do 15 min pešo" },
  { n: "2", l: "km do centra Nitry" },
  { n: "6", l: "min na diaľnicu R1" },
  { n: "Zobor", l: "les nad domovom", small: true },
];

function Header() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.timeline({ delay: 0.15 })
        .fromTo(".lh-rise", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.1, ease: "power3.out" })
        .fromTo(".lh-stat", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out" }, 0.5);
    },
    { scope: ref }
  );
  return (
    <section ref={ref} className="relative w-full overflow-hidden" style={{ backgroundColor: "#181913" }}>
      <div className="lk-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="mx-auto max-w-[1400px] px-[6%] pb-14 pt-36 md:pb-16 md:pt-44">
        <div className="lh-rise"><SheetRef label="Anima Residences · Nitra" /></div>
        <h1 className="lh-rise mt-7" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(46px, 9vw, 128px)", fontWeight: 300, lineHeight: 0.98, letterSpacing: "-0.015em", color: STONE }}>
          Lokalita
        </h1>
        <p className="lh-rise mt-8 max-w-[560px]" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, fontWeight: 300, lineHeight: 2, letterSpacing: "0.01em", color: "rgba(242,237,230,0.66)" }}>
          Pod zalesneným Zoborom, na dohľad od rieky a pár minút od historického
          centra najstaršieho mesta na Slovensku. Miesto, kde máte pokoj zelene aj
          všetko potrebné na dosah — presvedčte sa sami nižšie.
        </p>
        <div className="mt-14 grid max-w-[760px] grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="lh-stat" style={{ borderTop: "1px solid rgba(182,154,120,0.28)", paddingTop: 14 }}>
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: s.small ? "clamp(26px,3vw,38px)" : "clamp(34px,4vw,52px)", fontWeight: 300, lineHeight: 1, color: STONE }}>{s.n}</p>
              <p className="annot mt-2" style={{ fontSize: 9, color: GOLD, lineHeight: 1.6 }}>{s.l.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Orbit() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(".lo-rise", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 78%" } });
    },
    { scope: ref }
  );
  return (
    <section ref={ref} id="okolie" className="relative w-full" style={{ backgroundColor: "#141510" }}>
      <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="lo-rise mb-4"><SheetRef label="Všetko na dosah" /></div>
        <h2 className="lo-rise max-w-[720px]" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 4.6vw, 56px)", fontWeight: 300, lineHeight: 1.04, color: STONE }}>
          Sledujte, ako sa mesto priblíži
        </h2>
        <p className="lo-rise mt-5 max-w-[560px]" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, fontWeight: 300, lineHeight: 1.9, color: "rgba(242,237,230,0.6)" }}>
          Prepnite spôsob dopravy a body okolia sa presunú podľa skutočného času
          cesty. Vyberte kategóriu, prejdite myšou po bodoch — a uvidíte, čo všetko
          máte v pätnástich minútach.
        </p>
        <div className="lo-rise mt-14">
          <LocationOrbit />
        </div>
      </div>
    </section>
  );
}

function Connections() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(".cn-rise", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 74%" } });
      gsap.fromTo(".cn-bar > span", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 1.2, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 62%" } });
    },
    { scope: ref }
  );
  const maxKm = Math.max(...CONNECTIONS.map((c) => c.km));
  return (
    <section ref={ref} className="relative w-full" style={{ backgroundColor: "#181913" }}>
      <div className="mx-auto max-w-[1100px] px-[6%] py-24 md:py-32">
        <div className="cn-rise"><SheetRef label="Spojenie" /></div>
        <h2 className="cn-rise mt-6 mb-10" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.05, color: STONE }}>
          A svet za rohom
        </h2>
        <div>
          {CONNECTIONS.map((c) => (
            <div key={c.to} className="cn-row cn-rise">
              <div>
                <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 300, color: STONE }}>{c.to}</p>
                <div className="cn-bar mt-3" style={{ height: 2, background: "rgba(182,154,120,0.12)", position: "relative" }}>
                  <span style={{ position: "absolute", inset: 0, width: `${(c.km / maxKm) * 100}%`, background: `linear-gradient(to right, ${GOLD}, rgba(182,154,120,0.3))`, display: "block" }} />
                </div>
              </div>
              <p className="annot" style={{ fontSize: 11, color: "rgba(242,237,230,0.5)", textAlign: "right", minWidth: 64 }}>{c.km} km</p>
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 300, color: GOLD, textAlign: "right", minWidth: 84 }}>
                {c.min} <span className="annot" style={{ fontSize: 10, color: "rgba(242,237,230,0.4)" }}>min</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Story() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(".sy-rise", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 72%" } });
    },
    { scope: ref }
  );
  const blocks = [
    { k: "Zobor", t: "Les namiesto susedov za oknom", d: "Zalesnený masív Zobor dýcha mestu za chrbtom — ráno vybeh do lesa, cez víkend výhľad z vyhliadky na celú Nitru a Podunajskú nížinu." },
    { k: "Rieka", t: "Voda a promenáda na krok", d: "Nábrežie Nitry so súvislým cyklochodníkom vás bez jediného auta dovedie do parku aj do centra. Zeleň, ktorá pokračuje ďalej, než dovidíte." },
    { k: "Mesto", t: "Najstaršie mesto, na dosah ruky", d: "Nitriansky hrad, staré uličky, kaviarne a divadlo — história a život mesta sú vzdialené pár minút, no hluk zostáva za nimi." },
  ];
  return (
    <section ref={ref} className="relative w-full" style={{ backgroundColor: "#141510" }}>
      <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="sy-rise mb-14"><SheetRef label="Prostredie" /></div>
        <div className="grid gap-x-10 gap-y-14 md:grid-cols-3">
          {blocks.map((b, i) => (
            <div key={b.k} className="sy-rise">
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: 60, fontWeight: 300, lineHeight: 1, color: "rgba(182,154,120,0.5)" }}>{String(i + 1).padStart(2, "0")}</p>
              <p className="annot mt-5" style={{ fontSize: 9, color: GOLD }}>{b.k.toUpperCase()}</p>
              <h3 className="mt-3" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 300, lineHeight: 1.15, color: STONE }}>{b.t}</h3>
              <p className="mt-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, fontWeight: 300, lineHeight: 1.95, color: "rgba(242,237,230,0.6)" }}>{b.d}</p>
            </div>
          ))}
        </div>

        <div className="sy-rise mt-20 flex flex-wrap items-center justify-between gap-6" style={{ borderTop: "1px solid rgba(182,154,120,0.18)", paddingTop: 34 }}>
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(22px,3vw,34px)", fontWeight: 300, color: STONE, maxWidth: 520, lineHeight: 1.2 }}>
            Najlepšie sa lokalita zažije naživo.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/kontakt" className="annot" style={{ fontSize: 11, color: "#181913", background: GOLD, padding: "16px 28px" }}>DOHODNÚŤ OBHLIADKU →</Link>
            <Link href="/ponuka-bytov" className="annot" style={{ fontSize: 11, color: STONE, border: "1px solid rgba(242,237,230,0.3)", padding: "16px 28px" }}>PONUKA BYTOV</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LokalitaPage() {
  return (
    <>
      <Header />
      <Orbit />
      <Connections />
      <Story />
    </>
  );
}
