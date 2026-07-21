"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import SketchCanvas from "@/components/ui/SketchCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const CHARCOAL = "#1C1C1A";

/** How long a sheet holds the board before the hand moves to the next. */
const DWELL = 7000;

type Sheet = {
  key: string;
  title: string;
  note: string;
  sketch: string;
  items: string[];
};

const SHEETS: Sheet[] = [
  {
    key: "konstrukcia",
    title: "Konštrukcia & energetika",
    note: "Nízke náklady, ktoré cítiť až o roky neskôr.",
    sketch: "/images/sketches/sketch-konstrukcia",
    items: [
      "Nízkoenergetický štandard budovy",
      "Plynový kondenzačný kotol pre každý byt",
      "Riadené vetranie s rekuperáciou tepla",
      "Podlahové vykurovanie",
      "Individuálna regulácia vykurovania v každom byte",
    ],
  },
  {
    key: "interier",
    title: "Interiérový štandard",
    note: "Povrchy, ktoré nemusíte po prevzatí meniť.",
    sketch: "/images/sketches/sketch-interier",
    items: [
      "Kvalitné podlahy",
      "Interiérové dvere",
      "Dizajnové zariadenie kúpeľní",
      "Veľké presklené okná",
      "Príprava na klimatizáciu v obytných izbách",
      "Nadštandardné materiály a prevedenie interiéru",
    ],
  },
  {
    key: "spolocne",
    title: "Spoločné priestory",
    note: "Prvý dojem začína pri vstupných dverách.",
    sketch: "/images/sketches/sketch-spolocne",
    items: [
      "Reprezentatívna vstupná hala",
      "Bezbariérový výťah do všetkých podlaží",
      "Bezpečný vstup do bytového domu",
    ],
  },
  {
    key: "bezpecnost",
    title: "Bezpečnosť & smart",
    note: "Pokoj, o ktorom nemusíte premýšľať.",
    sketch: "/images/sketches/sketch-bezpecnost",
    items: [
      "Kamerový systém spoločných priestorov",
      "Videovrátnik",
      "Bezkľúčový prístup do objektu",
      "Samostatné meranie energií pre každý byt",
    ],
  },
  {
    key: "parkovanie",
    title: "Parkovanie & úložné",
    note: "Miesto pre auto aj pre všetko ostatné.",
    sketch: "/images/sketches/sketch-parkovanie",
    items: [
      "Parkovacie státie ku každému bytu",
      "Komfortné parkovanie priamo pri bytovom dome",
      "Pivničná kobka v cene bytu",
      "Praktické úložné priestory ku každému bytu",
    ],
  },
  {
    key: "lokalita",
    title: "Lokalita & okolie",
    note: "Tichá adresa, mesto na dosah.",
    sketch: "/images/sketches/sketch-lokalita",
    items: [
      "Tichá lokalita s výbornou dostupnosťou do centra Nitry",
      "Kompletná občianska vybavenosť v pešej dostupnosti",
      "Školy, škôlky a obchody v bezprostrednom okolí",
      "Parky a zeleň na každodenný oddych",
      "Rýchle napojenie na hlavné dopravné ťahy",
    ],
  },
];

const BASES = SHEETS.map((s) => s.sketch);

export default function Amenities() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false); // the visitor is looking; do not move
  const [inView, setInView] = useState(false);
  const dirRef = useRef(1);

  const go = useCallback((next: number, dir: number) => {
    dirRef.current = dir;
    setActive((next + SHEETS.length) % SHEETS.length);
  }, []);

  /* ── the section itself arrives ── */
  useGSAP(
    () => {
      const enter = { trigger: sectionRef.current, start: "top 74%" };
      gsap.fromTo(".am-reveal", { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.07, ease: "power3.out", scrollTrigger: enter });
      gsap.fromTo(".am-rule", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 1.2, ease: "power3.out", scrollTrigger: enter });
      gsap.fromTo(".am-idx", { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "power3.out", scrollTrigger: { trigger: ".am-index", start: "top 90%" } });
    },
    { scope: sectionRef }
  );

  /* ── the copy changes with the sheet ── */
  useGSAP(
    () => {
      const el = copyRef.current;
      if (!el) return;
      const d = dirRef.current;
      gsap
        .timeline()
        .fromTo(el.querySelectorAll(".am-line"), { yPercent: 110 }, { yPercent: 0, duration: 0.85, stagger: 0.05, ease: "power3.out" }, 0)
        .fromTo(el.querySelectorAll(".am-item"), { x: 22 * d, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: "power3.out" }, 0.12);
    },
    { dependencies: [active], scope: sectionRef }
  );

  /* Only run the carousel while somebody can actually see it. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── the dwell, and the bar that shows how much of it is left ── */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!inView || held || reduce) {
      gsap.killTweensOf(bar);
      if (!inView) gsap.set(bar, { scaleX: 0 });
      return;
    }

    const tl = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DWELL / 1000,
        ease: "none",
        onComplete: () => go(active + 1, 1),
      }
    );
    return () => {
      tl.kill();
    };
  }, [active, held, inView, go]);

  /* Arrow keys, once the carousel has been touched. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(active + 1, 1);
      if (e.key === "ArrowLeft") go(active - 1, -1);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [active, go]);

  const sheet = SHEETS[active];

  return (
    <section
      ref={sectionRef}
      id="amenities"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#F2EDE6", color: CHARCOAL }}
      tabIndex={-1}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div className="am-grid" aria-hidden />

      <div className="relative mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="flex items-baseline justify-between">
          <Mask>
            <SheetRef label="Vybavenie projektu" color="rgba(28,28,26,0.5)" />
          </Mask>
          <Mask>
            <p className="annot" style={{ fontSize: "10px", color: "rgba(28,28,26,0.4)" }}>ŠTANDARD</p>
          </Mask>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <h2
            className="max-w-[700px]"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 4.2vw, 64px)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.01em" }}
          >
            <Mask><span className="block">Postavené z detailov,</span></Mask>
            <Mask><span className="block" style={{ color: "rgba(28,28,26,0.45)" }}>ktoré je cítiť.</span></Mask>
          </h2>

          <Mask>
            <p
              className="max-w-[420px] lg:justify-self-end"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14.5px", fontWeight: 300, lineHeight: 2, letterSpacing: "0.02em", color: "rgba(28,28,26,0.7)" }}
            >
              To, čo nevidno, je tu urobené rovnako poctivo ako to, čo vidno. Skice
              sú z rúk architekta — prejdite po nich myšou.
            </p>
          </Mask>
        </div>

        <div className="am-rule mt-14 h-px w-full" style={{ backgroundColor: "rgba(28,28,26,0.15)" }} />

        {/* ── The board ── */}
        <div className="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-[0.86fr_1.14fr]">
          {/* what this sheet is */}
          <div className="am-index order-2 flex flex-col lg:order-1">
            <div ref={copyRef}>
              <div style={{ overflow: "hidden" }}>
                <h3
                  className="am-line"
                  style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 3.4vw, 46px)", fontWeight: 300, lineHeight: 1.1 }}
                >
                  {sheet.title}
                </h3>
              </div>
              <div style={{ overflow: "hidden" }}>
                <p
                  className="am-line mt-3"
                  style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: "19px", color: "rgba(28,28,26,0.5)" }}
                >
                  {sheet.note}
                </p>
              </div>

              <ul className="mt-9">
                {sheet.items.map((item) => (
                  <li key={item} className="am-item flex items-start gap-3.5 py-3.5" style={{ borderTop: "1px solid rgba(28,28,26,0.1)" }}>
                    <span
                      aria-hidden
                      style={{ display: "block", width: 7, height: 9, marginTop: 5, flexShrink: 0, borderRadius: "3.5px 3.5px 0 0", border: `1px solid ${GOLD}` }}
                    />
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "15px", fontWeight: 300, lineHeight: 1.6, color: "rgba(28,28,26,0.8)" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── the controls ── */}
            <div className="am-ctrl mt-auto pt-12">
              <div className="flex items-center gap-6">
                <button className="am-arrow" onClick={() => go(active - 1, -1)} aria-label="Predchádzajúce">
                  <span aria-hidden>←</span>
                </button>
                <button className="am-arrow" onClick={() => go(active + 1, 1)} aria-label="Ďalšie">
                  <span aria-hidden>→</span>
                </button>

                <span className="annot am-count" style={{ fontSize: "10px" }}>
                  <span style={{ color: CHARCOAL }}>{String(active + 1).padStart(2, "0")}</span>
                  <span style={{ color: "rgba(28,28,26,0.3)" }}> / {String(SHEETS.length).padStart(2, "0")}</span>
                </span>

                <span className="am-bar">
                  <span ref={barRef} className="am-bar-fill" />
                </span>
              </div>

              {/* every sheet, reachable in one click */}
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                {SHEETS.map((s, i) => (
                  <li key={s.key}>
                    <button
                      className="am-idx"
                      data-on={i === active}
                      onClick={() => go(i, i > active ? 1 : -1)}
                      aria-pressed={i === active}
                    >
                      {s.title.split(" ")[0]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* the sheet on the board */}
          <div className="order-1 lg:order-2">
            <div className="am-plate-frame">
              <SketchCanvas bases={BASES} index={active} />

              <div className="am-plate-title">
                <span className="annot" style={{ fontSize: "9px", color: "rgba(28,28,26,0.5)" }}>
                  {sheet.title.toUpperCase()}
                </span>
              </div>

              <span className="am-tick am-tick--tl" />
              <span className="am-tick am-tick--tr" />
              <span className="am-tick am-tick--bl" />
              <span className="am-tick am-tick--br" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Clips its child so GSAP can slide it up into view. */
function Mask({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <div className="am-reveal">{children}</div>
    </div>
  );
}
