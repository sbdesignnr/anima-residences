"use client";

/**
 * The location map — a real, live map of the setting.
 *
 * Leaflet + CARTO's dark basemap gives the actual streets, the river Nitra and
 * the Zobor massif, themed to the brand. The residence glows at its own address;
 * six flagship places are pinned at their real coordinates as pulsing beacons.
 * Point at (or tap) one and the same premium card opens — photo, times, bearing
 * and a "Trasa" button straight to Google Maps. No API key: the tiles are open.
 *
 * Loaded client-only (next/dynamic ssr:false in LokalitaPage) because Leaflet
 * reaches for `window` at import. Coordinates live in lokalita.ts — nudge the
 * residence pin there and every marker reframes around it.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CATEGORIES,
  MODES,
  POIS,
  RESIDENCE,
  bearingWord,
  mapsUrl,
  type CatKey,
  type Mode,
  type Poi,
} from "@/lib/lokalita";
import photosRaw from "@/lib/lokalita-photos.json";

type Photo = { src: string; avif: string; webp: string; lqip: string; width: number; height: number };
const PHOTOS = photosRaw as Record<string, Photo>;

/** The flagship places shown on the map — those that carry real coordinates. */
const FEATURED = ["sihot", "zobor", "univerzita", "spu", "nabrezie", "mlyny", "billa", "trznica", "hrad", "centrum", "synagoga", "urad", "kalvaria"];
const featuredPois = () =>
  FEATURED.map((s) => POIS.find((p) => p.slug === s)).filter(
    (p): p is Poi => !!p && p.lat != null && p.lng != null
  );

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
  sluzby: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
};
function CatGlyph({ cat, size = 22 }: { cat: CatKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {CAT_ICON[cat]}
    </svg>
  );
}

const coreHtml = `
  <span class="lm-core-aura2"></span>
  <span class="lm-core-disc2">
    <svg viewBox="0 0 30 34" width="17" height="19" fill="none" stroke="#B69A78" stroke-width="1.6" stroke-linejoin="round">
      <path d="M15 2C8 2 4 8 4 15v17h22V15C26 8 22 2 15 2Z"/>
      <path d="M15 11l-4 13M15 11l4 13M12.4 20h5.2"/>
    </svg>
  </span>
  <span class="lm-core-lab2">ANIMA RESIDENCES</span>`;

const pinHtml = (name: string, color: string) => `
  <span class="lm-pin-pulse" style="border-color:${color}"></span>
  <span class="lm-pin-pulse lm-pin-pulse-b" style="border-color:${color}"></span>
  <span class="lm-pin-dot" style="background:${color};box-shadow:0 0 10px ${color},0 0 4px ${color}"></span>
  <span class="lm-pin-lab">${name}</span>`;

export default function LocationMap() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const cardPosRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  const coarseRef = useRef(false);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [coarse, setCoarse] = useState(false);

  const enter = (slug: string) => {
    if (holdRef.current) clearTimeout(holdRef.current);
    activeRef.current = slug;
    setActive(slug);
  };
  const leave = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => { activeRef.current = null; setActive(null); }, 150);
  };
  const hold = () => { if (holdRef.current) clearTimeout(holdRef.current); };

  /** Anchor the floating card to its marker, kept inside the frame. */
  const placeCard = () => {
    const slug = activeRef.current;
    const map = mapRef.current;
    const wrap = cardPosRef.current;
    if (!slug || !map || !wrap || coarseRef.current) return;
    const p = bySlug(slug);
    if (p.lat == null || p.lng == null) return;
    const pt = map.latLngToContainerPoint([p.lat, p.lng]);
    const size = map.getSize();
    const tx = pt.x < 150 ? "-14px" : pt.x > size.x - 150 ? "calc(-100% + 14px)" : "-50%";
    const ty = pt.y < size.y * 0.52 ? "24px" : "calc(-100% - 24px)";
    wrap.style.left = `${pt.x}px`;
    wrap.style.top = `${pt.y}px`;
    wrap.style.transform = `translate(${tx}, ${ty})`;
  };

  // Build the map once.
  useEffect(() => {
    // Touch (or simply a narrow screen) docks the card as a bottom sheet; a
    // 262px card floating on a phone map is cramped. Read once, after mount.
    const coarseNow = window.matchMedia("(hover: none)").matches || window.innerWidth < 640;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoarse(coarseNow);
    coarseRef.current = coarseNow;

    const div = mapDivRef.current;
    if (!div || mapRef.current) return;

    const map = L.map(div, {
      zoomControl: true,
      scrollWheelZoom: false, // let the page scroll over the map
      attributionControl: true,
      dragging: true,
    });
    mapRef.current = map;
    map.zoomControl.setPosition("bottomright");

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // the residence
    L.marker([RESIDENCE.lat, RESIDENCE.lng], {
      icon: L.divIcon({ className: "lm-core-pin", html: coreHtml, iconSize: [30, 30], iconAnchor: [15, 15] }),
      interactive: false,
      zIndexOffset: -200,
    }).addTo(map);

    // the six places
    const pts: [number, number][] = [[RESIDENCE.lat, RESIDENCE.lng]];
    featuredPois().forEach((p) => {
      const color = CATEGORIES[p.cat].color;
      const m = L.marker([p.lat!, p.lng!], {
        icon: L.divIcon({ className: "lm-pin", html: pinHtml(p.name, color), iconSize: [22, 22], iconAnchor: [11, 11] }),
        riseOnHover: true,
        keyboard: false,
      }).addTo(map);
      m.on("mouseover", () => enter(p.slug));
      m.on("mouseout", () => leave());
      m.on("click", (e) => { L.DomEvent.stopPropagation(e); enter(p.slug); });
      pts.push([p.lat!, p.lng!]);
    });

    map.fitBounds(L.latLngBounds(pts), { padding: [72, 72], maxZoom: 15 });
    map.on("move zoom resize zoomanim", placeCard);
    map.on("click", () => leave()); // empty-map click closes the card
    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      if (holdRef.current) clearTimeout(holdRef.current);
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Reposition the card whenever the place changes.
  useEffect(() => { placeCard(); }, [active]);

  const activePoi = active ? bySlug(active) : null;
  const photo = activePoi ? PHOTOS[activePoi.slug] : null;

  return (
    <div className="lm-wrap">
      <div className="lm-stage">
        <div ref={mapDivRef} className="lm-map" />

        {activePoi && (
          <div ref={cardPosRef} className={`lm-cardpos${coarse ? " lm-cardpos--sheet" : ""}`}>
            <div className="lm-card" onMouseEnter={hold} onMouseLeave={leave}>
              <div className="lm-card-media">
                {photo ? (
                  <picture>
                    <source srcSet={photo.avif} type="image/avif" />
                    <source srcSet={photo.webp} type="image/webp" />
                    <img src={photo.src} alt={activePoi.name} className="lm-card-photo" style={{ backgroundImage: `url(${photo.lqip})` }} loading="lazy" />
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
                {coarse && <button className="lm-card-x" aria-label="Zavrieť" onClick={() => { activeRef.current = null; setActive(null); }}>×</button>}
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
          </div>
        )}
      </div>

      <p className="lm-hint annot">
        {coarse ? "ŤUKNITE NA ROZSVIETENÉ MIESTO" : "PREJDITE MYŠOU PO ROZSVIETENÝCH MIESTACH"} · reálna mapa okolia
      </p>
    </div>
  );
}
