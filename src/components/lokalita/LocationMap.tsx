"use client";

/**
 * The living map.
 *
 * A stylised chart of the setting — the wooded Zobor massif drawn as contours in
 * the north-east, the river Nitra flowing through, the park breathing at the top
 * — with the residence glowing at its heart. Six places pulse around it like
 * beacons; point at one and a small card opens with its photo, its times and a
 * "Trasa" button that hands straight off to Google Maps.
 *
 * All hand-built SVG — no map tiles, no API key — so it is fast, offline and
 * unlike anything on a developer's site. Photos come from the media pipeline
 * (lokalita-photos.json); a place with none shows an elegant category tile.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArchMark } from "@/components/ui/brand";
import {
  CATEGORIES,
  MODES,
  POIS,
  bearingWord,
  mapsUrl,
  type CatKey,
  type Mode,
  type Poi,
} from "@/lib/lokalita";
import photosRaw from "@/lib/lokalita-photos.json";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Photo = { src: string; avif: string; webp: string; lqip: string; width: number; height: number };
const PHOTOS = photosRaw as Record<string, Photo>;

const GOLD = "#B69A78";
const VW = 1000;
const VH = 640;
const CX = 500;
const CY = 332;

/** The six flagship places, hand-placed for a balanced chart around the core. */
const FEATURED: { slug: string; mx: number; my: number }[] = [
  { slug: "sihot", mx: 500, my: 118 },     // N — the park
  { slug: "zobor", mx: 786, my: 190 },     // NE — the hill
  { slug: "univerzita", mx: 800, my: 470 },// SE
  { slug: "nabrezie", mx: 484, my: 556 },  // S — the river
  { slug: "mlyny", mx: 196, my: 466 },     // SW
  { slug: "hrad", mx: 214, my: 178 },      // NW
];
const FEATURED_SLUGS = FEATURED.map((f) => f.slug);

const bySlug = (slug: string) => POIS.find((p) => p.slug === slug) as Poi;
const minutesOf = (p: Poi, m: Mode) => (m === "walk" ? p.walk : m === "bike" ? p.bike : p.car);

const CAT_ICON: Record<CatKey, React.ReactNode> = {
  priroda: <><path d="M2 20h20M4 20l5-7 4 5 3-4 4 6" /><circle cx="17.5" cy="7" r="2.2" /></>,
  gastro: <><path d="M6 8h11v3a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8z" /><path d="M17 9h2a2 2 0 0 1 0 4h-2" /><path d="M8.5 3v2M11.5 3v2M14.5 3v2" /></>,
  nakupy: <><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  vzdelanie: <><path d="M12 5l9 3.8-9 3.8-9-3.8L12 5z" /><path d="M6 10.4V15c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.6" /></>,
  zdravie: <><path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" /></>,
  doprava: <><rect x="4" y="4" width="16" height="12" rx="2" /><path d="M4 11h16" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" /></>,
  kultura: <><path d="M4 9l8-5 8 5" /><path d="M6 9.5v8M10 9.5v8M14 9.5v8M18 9.5v8" /><path d="M3.5 20.5h17" /></>,
};
function CatGlyph({ cat, size = 22 }: { cat: CatKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {CAT_ICON[cat]}
    </svg>
  );
}

/** Where the floating card sits relative to its marker, kept inside the frame. */
function cardTransform(mx: number, my: number) {
  const xp = (mx / VW) * 100;
  const yp = (my / VH) * 100;
  const tx = xp < 26 ? "-16px" : xp > 74 ? "calc(-100% + 16px)" : "-50%";
  const ty = yp < 46 ? "26px" : "calc(-100% - 26px)";
  return { left: `${xp}%`, top: `${yp}%`, transform: `translate(${tx}, ${ty})` };
}

export default function LocationMap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGGElement>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [coarse, setCoarse] = useState(false);

  // Touch vs pointer decides the card's placement, and "hover: none" simply
  // does not exist until the component is on a real device — read it once, after
  // mount, exactly as the building section does.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoarse(window.matchMedia("(hover: none)").matches);
  }, []);

  const enter = (slug: string) => {
    if (holdRef.current) clearTimeout(holdRef.current);
    setActive(slug);
  };
  const leave = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => setActive(null), 140);
  };
  const hold = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
  };

  // Entrance + a whisper of pointer parallax.
  useGSAP(
    () => {
      const st = { trigger: rootRef.current, start: "top 74%" };
      gsap.fromTo(".lm-rise", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: st });
      gsap.fromTo(".lm-geo > *", { opacity: 0 }, { opacity: 1, duration: 1.6, stagger: 0.12, ease: "power2.out", scrollTrigger: st });
      gsap.fromTo(".lm-marker", { opacity: 0, scale: 0, transformOrigin: "center" }, { opacity: 1, scale: 1, duration: 0.8, stagger: { each: 0.09, from: "random" }, ease: "back.out(1.7)", delay: 0.35, scrollTrigger: st });
      gsap.fromTo(".lm-core", { opacity: 0, scale: 0, transformOrigin: `${CX}px ${CY}px` }, { opacity: 1, scale: 1, duration: 1, ease: "back.out(1.5)", scrollTrigger: st });

      if (!window.matchMedia("(pointer: fine)").matches) return;
      const el = rootRef.current, map = mapRef.current;
      if (!el || !map) return;
      const xTo = gsap.quickTo(map, "x", { duration: 1, ease: "power3.out" });
      const yTo = gsap.quickTo(map, "y", { duration: 1, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 20);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 20);
      };
      const onLeave = () => { xTo(0); yTo(0); };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: rootRef }
  );

  const activePoi = active ? bySlug(active) : null;
  const activePos = active ? FEATURED.find((f) => f.slug === active)! : null;

  return (
    <div ref={rootRef} className="lm-wrap lm-rise" onClick={() => { if (coarse) setActive(null); }}>
      <div className="lm-stage">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="lm-svg" role="img" aria-label="Mapa okolia Anima Residences">
          <defs>
            <radialGradient id="lmCore" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="rgba(214,184,124,0.5)" />
              <stop offset="45%" stopColor="rgba(214,184,124,0.12)" />
              <stop offset="100%" stopColor="rgba(214,184,124,0)" />
            </radialGradient>
            <radialGradient id="lmVign" cx="0.5" cy="0.42" r="0.75">
              <stop offset="55%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
            </radialGradient>
            <linearGradient id="lmRiver" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(138,168,193,0.05)" />
              <stop offset="50%" stopColor="rgba(138,168,193,0.22)" />
              <stop offset="100%" stopColor="rgba(138,168,193,0.05)" />
            </linearGradient>
            <filter id="lmGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g ref={mapRef}>
            {/* ── geography ── */}
            <g className="lm-geo">
              {/* Zobor — contour rings in the NE */}
              {[92, 150, 214, 286, 366].map((r) => (
                <circle key={r} cx={902} cy={38} r={r} className="lm-contour" />
              ))}
              {/* the river Nitra */}
              <path d="M150 20 C 250 190, 300 360, 470 520 S 560 660, 470 720" className="lm-river-soft" />
              <path d="M150 20 C 250 190, 300 360, 470 520 S 560 660, 470 720" className="lm-river-core" />
              {/* the park, at the top */}
              <path d="M418 150 C 400 96, 470 66, 520 78 C 588 92, 616 132, 590 168 C 566 202, 470 210, 438 190 C 416 178, 416 164, 418 150 Z" className="lm-park" />
              {/* a few quiet streets on the city side */}
              <path d="M40 300 L 470 470" className="lm-street" />
              <path d="M120 560 L 520 300" className="lm-street" />
              <path d="M300 620 L 560 360" className="lm-street" />
            </g>

            {/* ── routes from the residence to each place ── */}
            <g className="lm-routes">
              {FEATURED.map((f) => (
                <line key={f.slug} x1={CX} y1={CY} x2={f.mx} y2={f.my} className="lm-route" data-on={active === f.slug} />
              ))}
            </g>

            {/* ── the residence ── */}
            <g className="lm-core">
              <circle cx={CX} cy={CY} r={150} fill="url(#lmCore)" className="lm-core-aura" />
              <circle cx={CX} cy={CY} r={30} className="lm-core-disc" />
              <g transform={`translate(${CX - 14} ${CY - 24})`}>
                <ArchMark size={28} color={GOLD} />
              </g>
              <text x={CX} y={CY + 52} className="lm-core-label">ANIMA RESIDENCES</text>
            </g>

            {/* ── beacons ── */}
            {FEATURED.map((f) => {
              const p = bySlug(f.slug);
              const color = CATEGORIES[p.cat].color;
              // Centred over the dot, above or below by which half it sits in —
              // so a long name never runs off the left or right edge.
              const anchor = "middle";
              const lx = 0;
              const ly = f.my > CY ? 34 : -20;
              return (
                <g
                  key={f.slug}
                  className="lm-marker"
                  data-on={active === f.slug}
                  transform={`translate(${f.mx} ${f.my})`}
                  style={{ ["--c" as string]: color }}
                  onMouseEnter={() => enter(f.slug)}
                  onMouseLeave={leave}
                  onClick={(e) => { e.stopPropagation(); enter(f.slug); }}
                  tabIndex={0}
                  onFocus={() => enter(f.slug)}
                  onBlur={leave}
                  role="button"
                  aria-label={p.name}
                >
                  <circle className="lm-pulse" r={12} />
                  <circle className="lm-pulse lm-pulse-b" r={12} />
                  <circle className="lm-hit" r={30} fill="transparent" />
                  <circle className="lm-halo" r={13} />
                  <circle className="lm-dot" r={6} filter="url(#lmGlow)" />
                  <text className="lm-mlabel" x={lx} y={ly} textAnchor={anchor}>{p.name}</text>
                </g>
              );
            })}
          </g>

          <rect x={0} y={0} width={VW} height={VH} fill="url(#lmVign)" pointerEvents="none" />
        </svg>

        {/* ── the preview card ── */}
        {activePoi && activePos && (
          <div
            className={`lm-card${coarse ? " lm-card--sheet" : ""}`}
            style={coarse ? undefined : cardTransform(activePos.mx, activePos.my)}
            onMouseEnter={hold}
            onMouseLeave={leave}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lm-card-media">
              {PHOTOS[activePoi.slug] ? (
                <picture>
                  <source srcSet={PHOTOS[activePoi.slug].avif} type="image/avif" />
                  <source srcSet={PHOTOS[activePoi.slug].webp} type="image/webp" />
                  <img src={PHOTOS[activePoi.slug].src} alt={activePoi.name} className="lm-card-photo" style={{ backgroundImage: `url(${PHOTOS[activePoi.slug].lqip})` }} loading="lazy" />
                </picture>
              ) : (
                <div className="lm-ph" style={{ ["--c" as string]: CATEGORIES[activePoi.cat].color }} aria-hidden>
                  <span className="lm-ph-ic" style={{ color: CATEGORIES[activePoi.cat].color }}><CatGlyph cat={activePoi.cat} size={40} /></span>
                </div>
              )}
              <span className="lm-card-cat annot" style={{ color: CATEGORIES[activePoi.cat].color }}>
                <span style={{ display: "inline-flex", color: CATEGORIES[activePoi.cat].color }}><CatGlyph cat={activePoi.cat} size={12} /></span>
                {CATEGORIES[activePoi.cat].label}
              </span>
              {coarse && <button className="lm-card-x" aria-label="Zavrieť" onClick={(e) => { e.stopPropagation(); setActive(null); }}>×</button>}
            </div>
            <div className="lm-card-body">
              <h4 className="lm-card-name">{activePoi.name}</h4>
              <p className="lm-card-note">{activePoi.note}</p>
              <div className="lm-card-times">
                {(Object.keys(MODES) as Mode[]).map((m) => (
                  <span key={m} className="lm-card-time">
                    <b>{minutesOf(activePoi, m)}</b><i>min</i>
                    <span>{MODES[m].label}</span>
                  </span>
                ))}
              </div>
              <div className="lm-card-foot">
                <span className="lm-card-dir annot">{bearingWord(activePoi.dir).toUpperCase()}</span>
                <a className="lm-card-route annot" href={mapsUrl(activePoi)} target="_blank" rel="noopener noreferrer">
                  TRASA <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="lm-hint annot lm-rise">
        {coarse ? "ŤUKNITE NA ROZSVIETENÉ MIESTO" : "PREJDITE MYŠOU PO ROZSVIETENÝCH MIESTACH"} · {FEATURED_SLUGS.length} vybraných miest
      </p>
    </div>
  );
}
