"use client";

/**
 * The price list — every apartment in one filterable, sortable table.
 *
 * Filters (floor · disposition · availability · price) narrow the set; the column
 * heads sort it; a row opens the full apartment detail (reused from the facade
 * selector) with its floor-mates as siblings. On a phone the table becomes cards,
 * because seven columns cannot honestly fit ~360 px.
 */

import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import ApartmentDetail from "@/components/sections/ApartmentDetail";
import {
  apartmentsFor,
  buildFloors,
  FLOOR_GEOMETRY,
  plural,
  type Apartment,
  type Floor,
} from "@/lib/building";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";
const GREEN = "#86926A";
const RED = "#9C6B5C";

const priceNum = (a: Apartment) => Number(a.cena.replace(/[^\d]/g, ""));
const npNum = (id: string) => Number(id.replace("NP", ""));
const eur = (n: number) => n.toLocaleString("sk-SK");

type SortKey = "id" | "floor" | "rooms" | "area" | "price" | "stav";
type Row = { apt: Apartment; floor: Floor };

const FLOORS = buildFloors(FLOOR_GEOMETRY);
const ROWS: Row[] = FLOORS.flatMap((floor) => apartmentsFor(floor).map((apt) => ({ apt, floor })));
const ALL_ROOMS = [...new Set(ROWS.map((r) => r.apt.dispozicia))];
const P_MIN = Math.min(...ROWS.map((r) => priceNum(r.apt)));
const P_MAX = Math.max(...ROWS.map((r) => priceNum(r.apt)));
const P_STEP = 1000;

function Dot({ free }: { free: boolean }) {
  return (
    <span style={{ display: "inline-block", width: 7, height: 9, borderRadius: "3.5px 3.5px 0 0", background: free ? GREEN : "transparent", border: `1px solid ${free ? GREEN : RED}`, opacity: free ? 0.95 : 0.6 }} />
  );
}

function SortTh({
  k,
  children,
  className = "",
  sort,
  onSort,
}: {
  k?: SortKey;
  children: React.ReactNode;
  className?: string;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className={`tbl-th ${className}`}
      onClick={k ? () => onSort(k) : undefined}
      data-sortable={!!k}
      aria-sort={k && sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {k && <span className="tbl-caret" data-on={sort.key === k}>{sort.key === k ? (sort.dir === 1 ? "▲" : "▼") : "◇"}</span>}
      </span>
    </th>
  );
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: T; t: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="annot mb-2.5" style={{ fontSize: 9, color: "rgba(242,237,230,0.4)" }}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} className="tbl-chip annot" data-on={o.v === value}>
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ApartmentTable() {
  const sectionRef = useRef<HTMLElement>(null);
  const [floorF, setFloorF] = useState<string>("all");
  const [roomsF, setRoomsF] = useState<string>("all");
  const [availF, setAvailF] = useState<string>("all");
  const [pLo, setPLo] = useState(P_MIN);
  const [pHi, setPHi] = useState(P_MAX);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "floor", dir: -1 });
  const [open, setOpen] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const out = ROWS.filter(
      (r) =>
        (floorF === "all" || r.apt.floorId === floorF) &&
        (roomsF === "all" || r.apt.dispozicia === roomsF) &&
        (availF === "all" || r.apt.stav === availF) &&
        priceNum(r.apt) >= pLo &&
        priceNum(r.apt) <= pHi
    );
    const val: Record<SortKey, (r: Row) => number | string> = {
      id: (r) => r.apt.id,
      floor: (r) => npNum(r.apt.floorId),
      rooms: (r) => parseFloat(r.apt.vymera), // by size within a disposition
      area: (r) => parseFloat(r.apt.vymera),
      price: (r) => priceNum(r.apt),
      stav: (r) => (r.apt.stav === "Voľný" ? 0 : 1),
    };
    const f = val[sort.key];
    return [...out].sort((a, b) => {
      const av = f(a), bv = f(b);
      if (av < bv) return -sort.dir;
      if (av > bv) return sort.dir;
      return a.apt.id < b.apt.id ? -1 : 1;
    });
  }, [floorF, roomsF, availF, pLo, pHi, sort]);

  const freeCount = rows.filter((r) => r.apt.stav === "Voľný").length;
  const reset = () => {
    setFloorF("all"); setRoomsF("all"); setAvailF("all"); setPLo(P_MIN); setPHi(P_MAX);
  };
  const setSortKey = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  useGSAP(
    () => {
      gsap.fromTo(
        ".tbl-rise",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 74%" } }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} id="cennik" className="relative w-full" style={{ backgroundColor: "#141510" }}>
      <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
        <div className="tbl-rise mb-9">
          <SheetRef label="Cenník" />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 4.6vw, 56px)", fontWeight: 300, lineHeight: 1.02, color: STONE }}>
              Prehľad bytov
            </h2>
            <p className="annot" style={{ fontSize: 10, color: "rgba(242,237,230,0.5)" }}>
              {rows.length} {plural(rows.length, "BYT", "BYTY", "BYTOV")}
              <span style={{ color: RED }}>{"  ·  "}{freeCount > 0 ? `${freeCount} ${plural(freeCount, "VOĽNÝ", "VOĽNÉ", "VOĽNÝCH")}` : "VYPREDANÉ"}</span>
            </p>
          </div>
        </div>

        {/* filters */}
        <div className="tbl-rise tbl-filters mb-8">
          <Chips
            label="PODLAŽIE"
            value={floorF}
            onChange={setFloorF}
            options={[{ v: "all", t: "Všetky" }, ...FLOORS.map((f) => ({ v: f.id as string, t: f.id }))]}
          />
          <Chips
            label="DISPOZÍCIA"
            value={roomsF}
            onChange={setRoomsF}
            options={[{ v: "all", t: "Všetky" }, ...ALL_ROOMS.map((r) => ({ v: r, t: r }))]}
          />
          <Chips
            label="DOSTUPNOSŤ"
            value={availF}
            onChange={setAvailF}
            options={[{ v: "all", t: "Všetky" }, { v: "Predané", t: "Predané" }]}
          />
          <div>
            <p className="annot mb-2.5" style={{ fontSize: 9, color: "rgba(242,237,230,0.4)" }}>
              CENA · {eur(pLo)} – {eur(pHi)} €
            </p>
            <div className="tbl-range">
              <div className="tbl-range-track" />
              <div className="tbl-range-fill" style={{ left: `${((pLo - P_MIN) / (P_MAX - P_MIN)) * 100}%`, right: `${(1 - (pHi - P_MIN) / (P_MAX - P_MIN)) * 100}%` }} />
              <input type="range" min={P_MIN} max={P_MAX} step={P_STEP} value={pLo} onChange={(e) => setPLo(Math.min(Number(e.target.value), pHi - P_STEP))} aria-label="Minimálna cena" />
              <input type="range" min={P_MIN} max={P_MAX} step={P_STEP} value={pHi} onChange={(e) => setPHi(Math.max(Number(e.target.value), pLo + P_STEP))} aria-label="Maximálna cena" />
            </div>
          </div>
        </div>

        {/* desktop table */}
        <div className="tbl-rise tbl-wrap hidden md:block">
          <table className="tbl">
            <thead>
              <tr>
                <SortTh k="id" sort={sort} onSort={setSortKey}>Byt</SortTh>
                <SortTh k="floor" sort={sort} onSort={setSortKey}>Podlažie</SortTh>
                <SortTh k="rooms" sort={sort} onSort={setSortKey}>Dispozícia</SortTh>
                <SortTh k="area" className="tbl-num" sort={sort} onSort={setSortKey}>Plocha</SortTh>
                <th className="tbl-th">Balkón</th>
                <SortTh k="price" className="tbl-num" sort={sort} onSort={setSortKey}>Cena</SortTh>
                <th className="tbl-th tbl-num">Parkovanie</th>
                <SortTh k="stav" sort={sort} onSort={setSortKey}>Stav</SortTh>
                <th className="tbl-th" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ apt, floor }) => {
                const free = apt.stav === "Voľný";
                return (
                  <tr key={apt.id} className="tbl-row" onClick={() => setOpen({ apt, floor })} tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" ? setOpen({ apt, floor }) : undefined)}>
                    <td className="tbl-id">{apt.id}</td>
                    <td>{apt.floorId}</td>
                    <td>{apt.dispozicia}</td>
                    <td className="tbl-num">{apt.vymera}</td>
                    <td style={{ color: apt.balkon === "—" ? "rgba(242,237,230,0.35)" : undefined }}>{apt.balkon}</td>
                    <td className="tbl-num" style={{ color: STONE }}>{apt.cena}</td>
                    <td className="tbl-num" style={{ color: "rgba(242,237,230,0.6)" }}>{apt.parkovanieCena}</td>
                    <td>
                      <span className="inline-flex items-center gap-2.5">
                        <Dot free={free} />
                        <span style={{ color: free ? GREEN : RED }}>{free ? "Voľný" : "Predané"}</span>
                      </span>
                    </td>
                    <td className="tbl-cta"><span className="annot">DETAIL →</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="annot py-14 text-center" style={{ fontSize: 11, color: "rgba(242,237,230,0.45)" }}>ŽIADNY BYT NEZODPOVEDÁ FILTRU · <button onClick={reset} style={{ color: GOLD }}>ZRUŠIŤ FILTRE</button></p>}
        </div>

        {/* phone cards */}
        <div className="tbl-rise md:hidden">
          {rows.map(({ apt, floor }) => {
            const free = apt.stav === "Voľný";
            return (
              <button key={apt.id} onClick={() => setOpen({ apt, floor })} className="tbl-card">
                <div className="flex items-baseline justify-between">
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: 30, fontWeight: 300, color: STONE }}>{apt.id}</span>
                  <span className="annot inline-flex items-center gap-2" style={{ fontSize: 9, color: free ? GREEN : RED }}><Dot free={free} />{free ? "VOĽNÝ" : "PREDANÝ"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  <span className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.55)" }}>{apt.floorId}</span>
                  <span className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.55)" }}>{apt.dispozicia}</span>
                  <span className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.55)" }}>{apt.vymera}</span>
                  <span className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.55)" }}>PARKOVANIE {apt.parkovanieCena}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: 22, fontWeight: 300, color: STONE }}>{apt.cena}</span>
                  <span className="annot" style={{ fontSize: 9, color: GOLD }}>DETAIL →</span>
                </div>
              </button>
            );
          })}
          {rows.length === 0 && <p className="annot py-10 text-center" style={{ fontSize: 11, color: "rgba(242,237,230,0.45)" }}>ŽIADNY BYT · <button onClick={reset} style={{ color: GOLD }}>ZRUŠIŤ FILTRE</button></p>}
        </div>
      </div>

      {open && (
        <div className="overlay-scroll fixed inset-0 z-[70]" style={{ backgroundColor: "#101109" }}>
          <ApartmentDetail
            apartment={open.apt}
            floor={open.floor}
            siblings={apartmentsFor(open.floor)}
            onClose={() => setOpen(null)}
            onSelect={(a) => setOpen({ apt: a, floor: open.floor })}
          />
        </div>
      )}
    </section>
  );
}
