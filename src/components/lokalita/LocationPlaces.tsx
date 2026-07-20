"use client";

/**
 * The places explorer.
 *
 * A filterable list of everything around the residence on the left; a large
 * preview on the right that shows the place you point at — its photo, its line,
 * how long it takes on foot / by bike / by car, its bearing, and a "Trasa"
 * button that opens Google Maps directions straight to it. Switch Pešo → Bicykel
 * → Auto and every time re-reads; filter a category and the list narrows. A live
 * counter tallies everything within fifteen minutes of the chosen mode.
 *
 * Photos come from `lokalita-photos.json` (written by the media pipeline). A
 * place with no photo yet shows an elegant category tile instead of a broken
 * image, so the page is complete before a single photo is delivered.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
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
const CAT_KEYS = Object.keys(CATEGORIES) as CatKey[];
const minutesOf = (p: Poi, m: Mode) => (m === "walk" ? p.walk : m === "bike" ? p.bike : p.car);

/** Line icons, one per category — the placeholder art and the list accents. */
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

export default function LocationPlaces() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("walk");
  const [cat, setCat] = useState<CatKey | "all">("all");
  const [activeSlug, setActiveSlug] = useState<string>(POIS[0].slug);

  const active = useMemo(
    () => POIS.find((p) => p.slug === activeSlug) ?? POIS[0],
    [activeSlug]
  );
  const within15 = useMemo(() => POIS.filter((p) => minutesOf(p, mode) <= 15).length, [mode]);
  const catCounts = useMemo(() => {
    const m = {} as Record<CatKey, number>;
    for (const k of CAT_KEYS) m[k] = 0;
    for (const p of POIS) m[p.cat]++;
    return m;
  }, []);

  // Choosing a category toggles it, and pulls the preview onto that category's
  // first place — done here, on the click, not in an effect syncing to state.
  const chooseCat = (k: CatKey) => {
    const next = cat === k ? "all" : k;
    setCat(next);
    if (next !== "all" && active.cat !== next) {
      const first = POIS.find((p) => p.cat === next);
      if (first) setActiveSlug(first.slug);
    }
  };

  // The list, grouped by category (a single group when a category is chosen).
  const groups = useMemo(() => {
    const keys = cat === "all" ? CAT_KEYS : [cat];
    return keys
      .map((k) => ({ k, items: POIS.filter((p) => p.cat === k).sort((a, b) => a.walk - b.walk) }))
      .filter((g) => g.items.length);
  }, [cat]);

  // Reveal the preview whenever the place changes.
  useEffect(() => {
    if (!mediaRef.current) return;
    gsap.fromTo(mediaRef.current, { opacity: 0.25, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" });
    if (infoRef.current) {
      gsap.fromTo(infoRef.current.querySelectorAll(".lp-info-anim"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power3.out" });
    }
  }, [activeSlug]);

  // Count-up on mode change.
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const from = Number(el.textContent) || 0;
    const p = { v: from };
    const tw = gsap.to(p, { v: within15, duration: 0.7, ease: "power2.out", onUpdate: () => (el.textContent = String(Math.round(p.v))) });
    return () => { tw.kill(); };
  }, [within15]);

  // Entrance.
  useGSAP(
    () => {
      gsap.fromTo(".lp-rise", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: rootRef.current, start: "top 76%" } });
    },
    { scope: rootRef }
  );

  const photo = PHOTOS[active.slug];
  const catColor = CATEGORIES[active.cat].color;

  const pick = (slug: string) => {
    setActiveSlug(slug);
    // On touch there is no hover — bring the preview into view on tap.
    if (window.matchMedia("(hover: none)").matches) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div ref={rootRef} className="lp-wrap">
      {/* ── controls ── */}
      <div className="lp-controls lp-rise">
        <div className="lp-modes">
          <span className="annot lp-modes-lbl">SPÔSOB DOPRAVY</span>
          <div className="lp-modes-btns">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button key={m} className="lp-mode annot" data-on={m === mode} onClick={() => setMode(m)}>
                {MODES[m].label}
              </button>
            ))}
          </div>
        </div>
        <div className="lp-count">
          <span ref={countRef} className="lp-count-n">{within15}</span>
          <span className="lp-count-l">miest do <b>15 minút</b> {MODES[mode].verb}</span>
        </div>
      </div>

      <div className="lp-cats lp-rise">
        <button className="lp-cat annot" data-on={cat === "all"} onClick={() => setCat("all")}>
          Všetko <span className="lp-cat-n">{POIS.length}</span>
        </button>
        {CAT_KEYS.map((k) => (
          <button key={k} className="lp-cat annot" data-on={cat === k} onClick={() => chooseCat(k)} style={{ ["--c" as string]: CATEGORIES[k].color }}>
            <span className="lp-cat-ic" style={{ color: CATEGORIES[k].color }}><CatGlyph cat={k} size={15} /></span>
            {CATEGORIES[k].label}
            <span className="lp-cat-n">{catCounts[k]}</span>
          </button>
        ))}
      </div>

      {/* ── list | preview ── */}
      <div className="lp-body">
        <div className="lp-list lp-rise">
          {groups.map((g) => (
            <div key={g.k} className="lp-group">
              <div className="lp-group-h">
                <span className="lp-group-ic" style={{ color: CATEGORIES[g.k].color }}><CatGlyph cat={g.k} size={16} /></span>
                <span className="annot lp-group-lbl">{CATEGORIES[g.k].label}</span>
                <span className="lp-group-line" />
                <span className="annot lp-group-n">{g.items.length}</span>
              </div>
              {g.items.map((p) => {
                const on = p.slug === active.slug;
                return (
                  <button
                    key={p.slug}
                    className="lp-row"
                    data-on={on}
                    style={{ ["--c" as string]: CATEGORIES[p.cat].color }}
                    onMouseEnter={() => setActiveSlug(p.slug)}
                    onFocus={() => setActiveSlug(p.slug)}
                    onClick={() => pick(p.slug)}
                  >
                    <span className="lp-row-name">{p.name}</span>
                    <span className="lp-row-time">
                      {minutesOf(p, mode)} <span className="lp-row-min">min</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* preview */}
        <div ref={previewRef} className="lp-preview lp-rise">
          <div className="lp-media" ref={mediaRef}>
            {photo ? (
              <picture>
                <source srcSet={photo.avif} type="image/avif" />
                <source srcSet={photo.webp} type="image/webp" />
                <img src={photo.src} alt={active.name} className="lp-photo" style={{ backgroundImage: `url(${photo.lqip})` }} loading="lazy" />
              </picture>
            ) : (
              <div className="lp-ph" style={{ ["--c" as string]: catColor }} aria-hidden>
                <span className="lp-ph-arc" />
                <span className="lp-ph-ic" style={{ color: catColor }}><CatGlyph cat={active.cat} size={68} /></span>
              </div>
            )}
            <span className="lp-media-scrim" aria-hidden />
            <span className="lp-media-cat annot" style={{ color: catColor }}>
              <span className="lp-cat-ic" style={{ color: catColor }}><CatGlyph cat={active.cat} size={13} /></span>
              {CATEGORIES[active.cat].label}
            </span>
            {/* compass — the bearing from the residence */}
            <span className="lp-compass" aria-hidden>
              <svg width="46" height="46" viewBox="0 0 46 46">
                <circle cx="23" cy="23" r="21" className="lp-compass-ring" />
                <g style={{ transform: `rotate(${active.dir}deg)`, transformOrigin: "23px 23px" }}>
                  <path d="M23 8 L27 24 L23 21 L19 24 Z" fill={GOLD} />
                </g>
                <text x="23" y="6.5" className="lp-compass-n">S</text>
              </svg>
            </span>
          </div>

          <div className="lp-info" ref={infoRef}>
            <h3 className="lp-info-anim lp-name">{active.name}</h3>
            <p className="lp-info-anim lp-note">{active.note}</p>
            <div className="lp-info-anim lp-times">
              {(Object.keys(MODES) as Mode[]).map((m) => (
                <span key={m} className="lp-time" data-on={m === mode}>
                  <b>{minutesOf(active, m)}</b><i>min</i>
                  <span>{MODES[m].label}</span>
                </span>
              ))}
            </div>
            <div className="lp-info-anim lp-foot">
              <span className="lp-bearing annot">SMER · {bearingWord(active.dir).toUpperCase()}</span>
              <a className="lp-route annot" href={mapsUrl(active)} target="_blank" rel="noopener noreferrer">
                TRASA <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
