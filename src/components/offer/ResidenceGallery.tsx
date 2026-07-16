"use client";

/**
 * The residence gallery — four exterior angles, each shot by day and by night.
 * The day/night switch cross-dissolves in place (both frames are stacked and one
 * fades over the other), so the same view slides from afternoon into evening. A
 * click opens a full-bleed lightbox with the same controls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import residencesData from "@/lib/residences.json";
import { SheetRef } from "@/components/ui/brand";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

type Shot = {
  angle: string;
  phase: "day" | "night";
  label: string;
  src: string;
  avif: string;
  webp: string;
  lqip: string;
  width: number;
  height: number;
};
type Angle = { angle: string; label: string; day?: Shot; night?: Shot };

const SHOTS = residencesData as Shot[];
const ANGLES: Angle[] = (() => {
  const map = new Map<string, Angle>();
  for (const s of SHOTS) {
    if (!map.has(s.angle)) map.set(s.angle, { angle: s.angle, label: s.label });
    map.get(s.angle)![s.phase] = s;
  }
  return [...map.values()];
})();

function Pic({ shot, eager, style }: { shot?: Shot; eager?: boolean; style?: React.CSSProperties }) {
  if (!shot) return null;
  return (
    <picture>
      <source srcSet={shot.avif} type="image/avif" />
      <source srcSet={shot.webp} type="image/webp" />
      <img
        src={shot.src}
        alt={shot.label}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }}
      />
    </picture>
  );
}

/** One angle: day beneath, night stacked over it and faded in on demand. */
function Frame({ angle, night, eager }: { angle: Angle; night: boolean; eager?: boolean }) {
  return (
    <div className="absolute inset-0" style={{ background: "#0b0c07" }}>
      {angle.day?.lqip && (
        <div className="absolute inset-0" style={{ backgroundImage: `url(${angle.day.lqip})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
      <div className="absolute inset-0"><Pic shot={angle.day} eager={eager} /></div>
      <div className="absolute inset-0" style={{ opacity: night ? 1 : 0, transition: "opacity 0.9s ease" }}>
        <Pic shot={angle.night} eager={eager} />
      </div>
    </div>
  );
}

export default function ResidenceGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [night, setNight] = useState(false);
  const [zoom, setZoom] = useState(false);

  const go = useCallback((dir: number) => setActive((v) => (v + dir + ANGLES.length) % ANGLES.length), []);

  // Arrow keys drive the angle; N toggles the hour; Esc leaves the lightbox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") setZoom(false);
      else if (e.key.toLowerCase() === "n") setNight((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    document.documentElement.style.overflow = zoom ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [zoom]);

  useGSAP(
    () => {
      const enter = { trigger: sectionRef.current, start: "top 74%" };
      gsap.fromTo(".rg-rise", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "power3.out", scrollTrigger: enter });
      gsap.fromTo(".rg-stage", { scale: 1.04, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out", scrollTrigger: enter });
    },
    { scope: sectionRef }
  );

  const current = ANGLES[active];
  const toggle = useMemo(
    () => (
      <div className="rg-toggle" role="tablist" aria-label="Denná alebo nočná scéna">
        {(["day", "night"] as const).map((p) => {
          const on = (p === "night") === night;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={on}
              onClick={() => setNight(p === "night")}
              className="annot rg-toggle-btn"
              data-on={on}
            >
              {p === "day" ? "DEŇ" : "NOC"}
            </button>
          );
        })}
      </div>
    ),
    [night]
  );

  return (
    <section ref={sectionRef} id="galeria" className="relative w-full" style={{ backgroundColor: "#181913" }}>
      <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="rg-rise"><SheetRef label="Vizualizácie" /></div>
            <h2
              className="rg-rise mt-6"
              style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 4.6vw, 56px)", fontWeight: 300, lineHeight: 1.02, color: STONE }}
            >
              Anima za dňa i v noci
            </h2>
          </div>
          <div className="rg-rise">{toggle}</div>
        </div>

        {/* stage */}
        <div className="rg-stage relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
          {ANGLES.map((a, i) => (
            <div
              key={a.angle}
              className="absolute inset-0"
              style={{ opacity: i === active ? 1 : 0, transition: "opacity 0.7s ease", pointerEvents: i === active ? "auto" : "none" }}
            >
              <Frame angle={a} night={night} eager={i === active || i === (active + 1) % ANGLES.length} />
            </div>
          ))}

          {/* gold frame corners */}
          <span className="rg-corner rg-corner--tl" />
          <span className="rg-corner rg-corner--tr" />
          <span className="rg-corner rg-corner--bl" />
          <span className="rg-corner rg-corner--br" />

          {/* caption + expand */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5 md:p-7"
               style={{ background: "linear-gradient(to top, rgba(8,8,6,0.6), rgba(8,8,6,0))" }}>
            <div>
              <p className="annot" style={{ fontSize: 9, color: GOLD }}>{String(active + 1).padStart(2, "0")} / {String(ANGLES.length).padStart(2, "0")}</p>
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(20px,2.6vw,30px)", fontWeight: 300, color: STONE, marginTop: 4 }}>
                {current.label}
              </p>
            </div>
            <button onClick={() => setZoom(true)} className="annot pointer-events-auto rg-expand" aria-label="Zväčšiť">
              ZVÄČŠIŤ <span aria-hidden>⤢</span>
            </button>
          </div>

          {/* arrows */}
          <button onClick={() => go(-1)} aria-label="Predchádzajúci pohľad" className="rg-arrow rg-arrow--l">‹</button>
          <button onClick={() => go(1)} aria-label="Ďalší pohľad" className="rg-arrow rg-arrow--r">›</button>
        </div>

        {/* thumbnails */}
        <div className="rg-rise mt-4 grid grid-cols-4 gap-3">
          {ANGLES.map((a, i) => {
            const shot = (night ? a.night : a.day) ?? a.day;
            return (
              <button key={a.angle} onClick={() => setActive(i)} className="rg-thumb" data-on={i === active} aria-label={a.label}>
                <Pic shot={shot} />
                <span className="rg-thumb-label annot">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* lightbox */}
      {zoom && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "rgba(9,9,7,0.96)" }} onClick={() => setZoom(false)}>
          <div className="flex items-center justify-between px-5 py-4 md:px-8" onClick={(e) => e.stopPropagation()}>
            <p className="annot" style={{ fontSize: 10, color: STONE }}>
              {current.label}<span style={{ color: "rgba(242,237,230,0.4)" }}> · {night ? "NOC" : "DEŇ"}</span>
            </p>
            <div className="flex items-center gap-5">
              {toggle}
              <button onClick={() => setZoom(false)} aria-label="Zavrieť" className="annot" style={{ fontSize: 22, color: STONE, lineHeight: 1 }}>×</button>
            </div>
          </div>
          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            {ANGLES.map((a, i) => (
              <div key={a.angle} className="absolute inset-0 flex items-center justify-center p-3 md:p-10" style={{ opacity: i === active ? 1 : 0, transition: "opacity 0.5s ease", pointerEvents: i === active ? "auto" : "none" }}>
                <div className="relative h-full w-full" style={{ maxWidth: "min(100%, 1500px)" }}>
                  <div className="absolute inset-0"><Pic shot={a.day} eager /></div>
                  <div className="absolute inset-0" style={{ opacity: night ? 1 : 0, transition: "opacity 0.9s ease" }}><Pic shot={a.night} eager /></div>
                </div>
              </div>
            ))}
            <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Predchádzajúci" className="rg-arrow rg-arrow--l">‹</button>
            <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Ďalší" className="rg-arrow rg-arrow--r">›</button>
          </div>
        </div>
      )}
    </section>
  );
}
