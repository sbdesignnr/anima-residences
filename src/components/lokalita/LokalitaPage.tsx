"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import dynamic from "next/dynamic";

// Leaflet reaches for `window` at import, so the map is client-only.
const LocationMap = dynamic(() => import("@/components/lokalita/LocationMap"), {
  ssr: false,
  loading: () => <div className="lm-stage" />,
});

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

const STATS = [
  { n: "4", l: "min pešo k OC Mlyny" },
  { n: "8", l: "min k univerzite" },
  { n: "6", l: "min na mestskú tržnicu" },
  { n: "Staré Mesto", l: "priamo v centre", small: true },
];

/** One responsive photo from the lokalita set — used across the Prostredie section. */
function Pic({ slug, alt }: { slug: string; alt: string }) {
  return (
    <picture>
      <source srcSet={`/images/lokalita/${slug}.avif`} type="image/avif" />
      <source srcSet={`/images/lokalita/${slug}.webp`} type="image/webp" />
      <img
        src={`/images/lokalita/${slug}.jpg`}
        alt={alt}
        loading="lazy"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </picture>
  );
}

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
        <div className="lh-rise"><SheetRef label="Anima Residences · Smetanova 26, Nitra" /></div>
        <h1 className="lh-rise mt-7" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(46px, 9vw, 128px)", fontWeight: 300, lineHeight: 0.98, letterSpacing: "-0.015em", color: STONE }}>
          Lokalita
        </h1>
        <p className="lh-rise mt-8 max-w-[600px]" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 18, fontWeight: 300, lineHeight: 1.85, letterSpacing: "0.01em", color: "rgba(242,237,230,0.72)" }}>
          V srdci nitrianskeho Starého Mesta — na Smetanovej 26, kúsok od
          Svätoplukovho námestia a s OC Mlyny hneď za rohom. Obchody, tržnica,
          škola aj univerzita na pár minút pešo, rieka a mestský park na dosah.
          Bývanie, kde máte celé mesto pod nohami.
        </p>
        <div className="mt-14 grid max-w-[820px] grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="lh-stat" style={{ borderTop: "1px solid rgba(182,154,120,0.28)", paddingTop: 14 }}>
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: s.small ? "clamp(26px,3vw,38px)" : "clamp(34px,4vw,52px)", fontWeight: 300, lineHeight: 1, color: STONE }}>{s.n}</p>
              <p className="annot mt-2" style={{ fontSize: 10, color: GOLD, lineHeight: 1.6 }}>{s.l.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Places() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(".lo-rise", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 82%" } });
    },
    { scope: ref }
  );
  return (
    <section ref={ref} id="okolie" className="relative w-full" style={{ backgroundColor: "#141510" }}>
      <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="lo-rise mb-4"><SheetRef label="Všetko na dosah" /></div>
        <h2 className="lo-rise max-w-[760px]" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 4.6vw, 56px)", fontWeight: 300, lineHeight: 1.04, color: STONE }}>
          Celé okolie na jednej mape
        </h2>
        <p className="lo-rise mt-5 max-w-[600px]" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 17, fontWeight: 300, lineHeight: 1.8, color: "rgba(242,237,230,0.66)" }}>
          Anima na Smetanovej 26 žiari v strede — obchody, tržnica, hrad, park aj
          rieka naokolo. Prejdite myšou po rozsvietenom mieste a otvorí sa náhľad:
          fotka, časy cesty, a tlačidlo{" "}
          <b style={{ color: GOLD, fontWeight: 400 }}>Trasa</b>, ktoré vás rovno
          navedie v Google Mapách.
        </p>
        <div className="lo-rise mt-12">
          <LocationMap />
        </div>
      </div>
    </section>
  );
}

function Story() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(".sy-rise", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 78%" } });
      gsap.fromTo(".sy-lead-img", { scale: 1.08 }, { scale: 1, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 85%" } });
    },
    { scope: ref }
  );
  const blocks = [
    { k: "Staré Mesto", t: "Celé mesto máte pod nohami", d: "Svätoplukovo námestie, staré uličky, kaviarne aj Nitriansky hrad sú na pešo. Bývate priamo tam, kam ostatní chodia — v živom srdci najstaršieho mesta na Slovensku.", img: "hrad", alt: "Nitriansky hrad nad Starým Mestom" },
    { k: "Vzdelanie & služby", t: "Nákup, škola aj univerzita vedľa", d: "OC Mlyny za rohom, mestská tržnica pár krokov, dve univerzity aj zastávka MHD na dosah. Každodenný život vybavíte pešo — bez dochádzania a bez kompromisov.", img: "univerzita", alt: "Univerzita v Nitre" },
    { k: "Rieka & výhľady", t: "Zeleň a rieka Nitra okolo vás", d: "Mestský park a nábrežie so súvislým cyklochodníkom, Kalvária aj zalesnený Zobor nad mestom — z centra sa za pár minút dostanete k vode aj do lesa, bez auta.", img: "zobor", alt: "Nitra a rieka z výšky" },
  ];
  return (
    <section ref={ref} className="relative w-full" style={{ backgroundColor: "#141510" }}>
      <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="sy-rise mb-10"><SheetRef label="Prostredie" /></div>

        {/* Emotional lead image — the river, the park, the castle at golden hour */}
        <div className="sy-rise relative w-full overflow-hidden" style={{ aspectRatio: "21 / 9", marginBottom: "clamp(48px, 7vw, 88px)" }}>
          <div className="sy-lead-img absolute inset-0">
            <Pic slug="sihot" alt="Mestský park a nábrežie rieky Nitra pri západe slnka" />
          </div>
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,11,7,0.9) 0%, rgba(10,11,7,0.25) 52%, rgba(10,11,7,0.15) 100%)" }} aria-hidden />
          <div className="absolute" style={{ left: "6%", right: "6%", bottom: "8%" }}>
            <h3 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(26px, 3.6vw, 48px)", fontWeight: 300, lineHeight: 1.1, color: STONE, maxWidth: 680 }}>
              Domov v centre — a predsa s riekou, parkom a zeleňou na dosah ruky.
            </h3>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-16 md:grid-cols-3">
          {blocks.map((b, i) => (
            <div key={b.k} className="sy-rise">
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 11", marginBottom: 24 }}>
                <Pic slug={b.img} alt={b.alt} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,11,7,0.4) 0%, rgba(10,11,7,0) 45%)" }} aria-hidden />
                <span className="annot absolute" style={{ left: 14, bottom: 12, fontSize: 9, color: STONE, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                  {String(i + 1).padStart(2, "0")} · {b.k.toUpperCase()}
                </span>
              </div>
              <h3 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(23px,2.7vw,31px)", fontWeight: 300, lineHeight: 1.15, color: STONE }}>{b.t}</h3>
              <p className="mt-4" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 17, fontWeight: 300, lineHeight: 1.8, color: "rgba(242,237,230,0.66)" }}>{b.d}</p>
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
      <Places />
      <Story />
    </>
  );
}
