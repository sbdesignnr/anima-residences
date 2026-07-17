"use client";

/**
 * The reachability orbit.
 *
 * The residence sits at the centre; every place around it is a gold node set at
 * its real DIRECTION, at a radius proportional to how long it takes to get there
 * in the chosen mode. Switch Pešo → Bicykel → Auto and the whole constellation
 * glides inward — you watch the city pull closer. Filter a category and its nodes
 * light up with drawn connector lines; hover one for its detail. A live counter
 * tallies everything within fifteen minutes of the chosen mode.
 *
 * All hand-built SVG — no map tiles, no API — so it is fast, offline and unlike
 * anything on a developer's site.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArchMark } from "@/components/ui/brand";
import {
  CATEGORIES,
  MODES,
  POIS,
  type CatKey,
  type Mode,
  type Poi,
} from "@/lib/lokalita";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";

const CX = 450;
const CY = 450;
const R5 = 112;
const R10 = 226;
const R15 = 340;
const REDGE = 404;
const RINGS: { r: number; label: string }[] = [
  { r: R5, label: "5 min" },
  { r: R10, label: "10 min" },
  { r: R15, label: "15 min" },
];

const minutesOf = (p: Poi, m: Mode) => (m === "walk" ? p.walk : m === "bike" ? p.bike : p.car);

const radiusFor = (min: number) =>
  min <= 15 ? (min / 15) * R15 : R15 + (1 - Math.exp(-(min - 15) / 10)) * (REDGE - R15);

const round1 = (n: number) => Math.round(n * 10) / 10;
const posOf = (dir: number, min: number) => {
  const a = (dir * Math.PI) / 180;
  const r = radiusFor(min);
  // Rounded so server and client agree — Math.sin/cos/exp can differ in the last
  // bit between engines, which would otherwise trip a hydration mismatch.
  return { x: round1(CX + r * Math.sin(a)), y: round1(CY - r * Math.cos(a)) };
};

const CAT_KEYS = Object.keys(CATEGORIES) as CatKey[];

/** Stable starting positions (walk mode). Kept constant so React never rewrites
 *  the transform we drive imperatively on mode change. */
const INITIAL = POIS.map((p) => posOf(p.dir, p.walk));

export default function LocationOrbit() {
  const rootRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<SVGGElement>(null);
  const nodeEls = useRef<(SVGGElement | null)[]>([]);
  const lineEls = useRef<(SVGLineElement | null)[]>([]);
  const posRef = useRef(INITIAL.map((p) => ({ ...p })));
  const countRef = useRef<HTMLSpanElement>(null);

  const [mode, setMode] = useState<Mode>("walk");
  const [cat, setCat] = useState<CatKey | "all">("all");
  const [active, setActive] = useState<Poi | null>(null);

  const within15 = useMemo(() => POIS.filter((p) => minutesOf(p, mode) <= 15).length, [mode]);
  const catCounts = useMemo(() => {
    const m = {} as Record<CatKey, number>;
    for (const k of CAT_KEYS) m[k] = 0;
    for (const p of POIS) m[p.cat]++;
    return m;
  }, []);

  // Place nodes for the mode; glide them when the mode changes.
  useEffect(() => {
    const targets = POIS.map((p) => posOf(p.dir, minutesOf(p, mode)));
    const starts = posRef.current.map((p) => ({ ...p }));
    const proxy = { t: 0 };
    const apply = (t: number) => {
      POIS.forEach((_, i) => {
        const x = starts[i].x + (targets[i].x - starts[i].x) * t;
        const y = starts[i].y + (targets[i].y - starts[i].y) * t;
        posRef.current[i] = { x, y };
        nodeEls.current[i]?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        const ln = lineEls.current[i];
        if (ln) {
          ln.setAttribute("x2", x.toFixed(1));
          ln.setAttribute("y2", y.toFixed(1));
        }
      });
    };
    const tw = gsap.to(proxy, { t: 1, duration: 1.05, ease: "power3.inOut", onUpdate: () => apply(proxy.t) });
    return () => {
      tw.kill();
    };
  }, [mode]);

  // Count-up on mode change.
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const from = Number(el.textContent) || 0;
    const p = { v: from };
    const tw = gsap.to(p, {
      v: within15,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => (el.textContent = String(Math.round(p.v))),
    });
    return () => {
      tw.kill();
    };
  }, [within15]);

  // Entrance + pointer parallax.
  useGSAP(
    () => {
      const st = { trigger: rootRef.current, start: "top 72%" };
      gsap.fromTo(".orbit-rise", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: st });
      gsap.fromTo(".orbit-ring", { scale: 0.55, opacity: 0, transformOrigin: "450px 450px" }, { scale: 1, opacity: 1, duration: 1.5, stagger: 0.12, ease: "power3.out", scrollTrigger: st });
      gsap.fromTo(".orbit-node", { opacity: 0, scale: 0, transformOrigin: "center" }, { opacity: 1, scale: 1, duration: 0.7, stagger: { each: 0.02, from: "random" }, ease: "back.out(1.7)", delay: 0.3, scrollTrigger: st });
      gsap.fromTo(".orbit-core", { scale: 0, opacity: 0, transformOrigin: "450px 450px" }, { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.6)", scrollTrigger: st });

      if (!window.matchMedia("(pointer: fine)").matches) return;
      const el = rootRef.current;
      const orbit = orbitRef.current;
      if (!el || !orbit) return;
      const xTo = gsap.quickTo(orbit, "x", { duration: 0.9, ease: "power3.out" });
      const yTo = gsap.quickTo(orbit, "y", { duration: 0.9, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 26);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 26);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: rootRef }
  );

  const shown = active ?? null;

  return (
    <div ref={rootRef} className="orbit-wrap">
      {/* ── controls ── */}
      <div className="orbit-panel orbit-rise">
        <p className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.4)", marginBottom: 12 }}>SPÔSOB DOPRAVY</p>
        <div className="orbit-modes">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button key={m} className="orbit-mode annot" data-on={m === mode} onClick={() => setMode(m)}>
              {MODES[m].label}
            </button>
          ))}
        </div>

        <div className="orbit-count">
          <span ref={countRef} className="orbit-count-n">{within15}</span>
          <span className="orbit-count-l">
            miest do <b>15 minút</b>
            <br />
            {MODES[mode].verb} od domova
          </span>
        </div>

        <p className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.4)", margin: "6px 0 10px" }}>KATEGÓRIE</p>
        <div className="orbit-cats">
          <button className="orbit-cat annot" data-on={cat === "all"} onClick={() => setCat("all")}>
            <span className="orbit-cat-dot" style={{ background: GOLD }} />Všetko
          </button>
          {CAT_KEYS.map((k) => (
            <button key={k} className="orbit-cat annot" data-on={cat === k} onClick={() => setCat((c) => (c === k ? "all" : k))}>
              <span className="orbit-cat-dot" style={{ background: CATEGORIES[k].color }} />
              {CATEGORIES[k].label}
              <span className="orbit-cat-n">{catCounts[k]}</span>
            </button>
          ))}
        </div>

        {/* detail */}
        <div className="orbit-card" data-on={!!shown}>
          {shown ? (
            <>
              <span className="orbit-card-cat annot" style={{ color: CATEGORIES[shown.cat].color }}>
                <span className="orbit-cat-dot" style={{ background: CATEGORIES[shown.cat].color }} />
                {CATEGORIES[shown.cat].label}
              </span>
              <p className="orbit-card-name">{shown.name}</p>
              {shown.note && <p className="orbit-card-note">{shown.note}</p>}
              <div className="orbit-card-times">
                {(Object.keys(MODES) as Mode[]).map((m) => (
                  <span key={m} className="orbit-card-time" data-on={m === mode}>
                    <b>{minutesOf(shown, m)}</b> min
                    <span>{MODES[m].label}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="orbit-card-hint annot">NAJDITE MYŠOU NA BOD · alebo vyberte kategóriu</p>
          )}
        </div>
      </div>

      {/* ── the orbit ── */}
      <div className="orbit-stage orbit-rise">
        <svg viewBox="0 0 900 900" className="orbit-svg" role="img" aria-label="Mapa dostupnosti okolia">
          <defs>
            <radialGradient id="orbCore" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="rgba(214,184,124,0.5)" />
              <stop offset="45%" stopColor="rgba(214,184,124,0.12)" />
              <stop offset="100%" stopColor="rgba(214,184,124,0)" />
            </radialGradient>
            <filter id="orbGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g ref={orbitRef}>
            {/* rings */}
            {RINGS.map((ring) => (
              <g key={ring.r} className="orbit-ring">
                <circle cx={CX} cy={CY} r={ring.r} className="orbit-ring-c" />
                <text x={CX} y={CY - ring.r - 8} className="orbit-ringlabel">{ring.label}</text>
              </g>
            ))}

            {/* compass ticks */}
            {[["S", 0], ["V", 90], ["J", 180], ["Z", 270]].map(([lab, deg]) => {
              const a = ((deg as number) * Math.PI) / 180;
              const x = round1(CX + (REDGE + 18) * Math.sin(a));
              const y = round1(CY - (REDGE + 18) * Math.cos(a));
              return <text key={lab as string} x={x} y={y} className="orbit-compass">{lab}</text>;
            })}

            {/* connector lines (shown when a category is picked) */}
            <g className="orbit-links" data-on={cat !== "all"}>
              {POIS.map((p, i) => (
                <line
                  key={i}
                  ref={(el) => { lineEls.current[i] = el; }}
                  x1={CX}
                  y1={CY}
                  x2={INITIAL[i].x}
                  y2={INITIAL[i].y}
                  className="orbit-link"
                  style={{ stroke: CATEGORIES[p.cat].color, opacity: cat !== "all" && cat === p.cat ? 0.5 : 0 }}
                />
              ))}
            </g>

            {/* the residence */}
            <g className="orbit-core">
              <circle cx={CX} cy={CY} r={160} fill="url(#orbCore)" className="orbit-core-aura" />
              <circle cx={CX} cy={CY} r={34} className="orbit-core-disc" />
              <g transform={`translate(${CX - 15} ${CY - 26})`}>
                <ArchMark size={30} color={GOLD} />
              </g>
              <text x={CX} y={CY + 26} className="orbit-core-label">ANIMA</text>
            </g>

            {/* POI nodes */}
            {POIS.map((p, i) => {
              const dim = cat !== "all" && cat !== p.cat;
              const label = (cat !== "all" && cat === p.cat) || active?.name === p.name;
              const color = CATEGORIES[p.cat].color;
              return (
                <g
                  key={i}
                  ref={(el) => { nodeEls.current[i] = el; }}
                  transform={`translate(${INITIAL[i].x} ${INITIAL[i].y})`}
                  className="orbit-node"
                  data-dim={dim}
                  data-label={label}
                  onPointerEnter={() => setActive(p)}
                  onClick={() => setActive(p)}
                >
                  <circle r={16} className="orbit-hit" fill="transparent" />
                  <circle r={11} className="orbit-halo" style={{ stroke: color }} />
                  <circle r={6.5} className="orbit-dot" style={{ fill: color }} filter="url(#orbGlow)" />
                  <g className="orbit-tag">
                    <text y={-16} className="orbit-label">{p.name}</text>
                    <text y={-3} className="orbit-time">{minutesOf(p, mode)} min</text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
