"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { apartmentsFor, buildFloors, FLOOR_GEOMETRY, type Apartment } from "@/lib/building";

const GOLD = "#B69A78";
const STONE = "#F2EDE6";
const GREEN = "#86926A";

/* ── the maths ───────────────────────────────────────────────────────────── */

/** Annuity: P·r / (1 − (1+r)^−n). At 0 % it degenerates to P/n. */
function monthly(P: number, annualPct: number, years: number) {
  const n = years * 12;
  const r = annualPct / 100 / 12;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/** What is still owed after k months. */
function balanceAt(P: number, annualPct: number, years: number, k: number) {
  const r = annualPct / 100 / 12;
  const pay = monthly(P, annualPct, years);
  if (r === 0) return Math.max(0, P - pay * k);
  const g = Math.pow(1 + r, k);
  return Math.max(0, P * g - (pay * (g - 1)) / r);
}

const eur = (n: number) => Math.round(n).toLocaleString("sk-SK");

/* ── the apartments, as they really are ──────────────────────────────────── */

const ALL: Apartment[] = buildFloors(FLOOR_GEOMETRY).flatMap(apartmentsFor);
const priceOf = (a: Apartment) => Number(a.cena.replace(/[^\d]/g, ""));

/* ── the calculator ──────────────────────────────────────────────────────── */

/**
 * A mortgage calculator asking for "the loan amount" is a calculator for a bank.
 * The buyer does not know the loan amount — they know which flat they like. So
 * that is the question this one asks, off the real price list, and the loan is
 * what it works OUT. Everything else follows from three handles.
 */
export default function HypoCalc() {
  /** The cheapest apartment actually for sale — the honest default. */
  const initial = useMemo(() => {
    const free = ALL.filter((a) => a.stav === "Voľný");
    return (free.length ? free : ALL).reduce((a, b) => (priceOf(a) <= priceOf(b) ? a : b));
  }, []);

  const [flat, setFlat] = useState<Apartment>(initial);
  const [ownPct, setOwnPct] = useState(20);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(4.2);

  const price = priceOf(flat);
  const own = Math.round((price * ownPct) / 100);
  const loan = price - own;
  const pay = monthly(loan, rate, years);
  const totalPaid = pay * years * 12;
  const interest = totalPaid - loan;

  return (
    <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      {/* ── what you are buying ── */}
      <div>
        <Legend>KTORÝ BYT</Legend>
        <p
          className="mt-3 max-w-[380px]"
          style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, lineHeight: 1.9, color: "rgba(242,237,230,0.5)" }}
        >
          Žiadna abstraktná „výška úveru“ — skutočné byty, ktoré tu máme, so
          skutočnými cenami.
        </p>

        <div className="fc-grid mt-6">
          {ALL.map((a) => {
            const free = a.stav === "Voľný";
            return (
              <button
                key={a.id}
                className="fc-flat"
                data-on={a.id === flat.id}
                data-free={free}
                onClick={() => setFlat(a)}
                aria-pressed={a.id === flat.id}
              >
                <span className="fc-flat-id">{a.id}</span>
                <span className="fc-flat-m">{a.vymera}</span>
                <span className="fc-flat-p">{eur(priceOf(a))} €</span>
                {!free && <span className="fc-flat-x">REZERVOVANÝ</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-9">
          <Handle label="VLASTNÉ ZDROJE" value={`${ownPct} %`} sub={`${eur(own)} €`} min={10} max={50} step={5} v={ownPct} onChange={setOwnPct} />
          <Handle label="DOBA SPLÁCANIA" value={`${years} rokov`} min={15} max={30} step={1} v={years} onChange={setYears} />
          <Handle
            label="ÚROKOVÁ SADZBA"
            value={`${rate.toFixed(1).replace(".", ",")} % p. a.`}
            sub="orientačná — poradca nájde tú vašu"
            min={2.5}
            max={6}
            step={0.1}
            v={rate}
            onChange={setRate}
          />
        </div>
      </div>

      {/* ── what it costs ── */}
      <div className="fc-out">
        <div className="flex items-baseline justify-between">
          <Legend>MESAČNÁ SPLÁTKA</Legend>
          <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.35)" }}>
            {flat.id} · {flat.dispozicia}
          </span>
        </div>

        <Counter value={pay} />
        <Curve price={price} loan={loan} rate={rate} years={years} />

        <dl className="mt-8 grid grid-cols-2 gap-x-10">
          <Fig label="Hypotéka" value={`${eur(loan)} €`} />
          <Fig label="Vlastné zdroje" value={`${eur(own)} €`} />
          <Fig label="Celkovo zaplatíte" value={`${eur(totalPaid + own)} €`} />
          <Fig label="Z toho úroky" value={`${eur(interest)} €`} tone={GOLD} />
        </dl>

        <Tradeoff loan={loan} rate={rate} years={years} interest={interest} pay={pay} />
      </div>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Legend({ children }: { children: string }) {
  return (
    <span className="annot" style={{ fontSize: "9px", color: GOLD }}>
      {children}
    </span>
  );
}

function Handle({
  label,
  value,
  sub,
  min,
  max,
  step,
  v,
  onChange,
}: {
  label: string;
  value: string;
  sub?: string;
  min: number;
  max: number;
  step: number;
  v: number;
  onChange: (n: number) => void;
}) {
  const pct = ((v - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.5)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "21px", fontWeight: 300, color: STONE, whiteSpace: "nowrap" }}>
          {value}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="hypo-range mt-3.5 w-full"
        style={{ background: `linear-gradient(to right, ${GOLD} ${pct}%, rgba(242,237,230,0.14) ${pct}%)` }}
      />
      {sub && (
        <span className="annot mt-2.5 block" style={{ fontSize: "9px", color: "rgba(242,237,230,0.35)" }}>
          {sub.toUpperCase()}
        </span>
      )}
    </label>
  );
}

/** The figure counts to its answer rather than snapping — the number IS the page. */
function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = { v: Number(el.dataset.v ?? value) };
    const t = gsap.to(p, {
      v: value,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => (el.textContent = eur(p.v)),
      onComplete: () => {
        el.dataset.v = String(value);
        el.textContent = eur(value);
      },
    });
    return () => {
      t.kill();
    };
  }, [value]);

  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-3" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 300, color: STONE }}>
      <span ref={ref} data-v={value} style={{ fontSize: "clamp(46px, 5.4vw, 74px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {eur(value)}
      </span>
      <span style={{ fontSize: "24px", color: "rgba(242,237,230,0.5)" }}>€ / mesiac</span>
    </p>
  );
}

/**
 * The debt, falling.
 *
 * The dashed line is what you would owe if every payment went to the debt: a
 * straight run from the loan to zero. The curve is what you ACTUALLY owe, and it
 * hangs above that line because the early years are nearly all interest. The gap
 * between the two IS the interest, drawn to scale — so nobody has to be TOLD
 * what borrowing for thirty years instead of twenty costs. They can see it, and
 * they can watch it swell as they drag the handle.
 */
function Curve({ price, loan, rate, years }: { price: number; loan: number; rate: number; years: number }) {
  const W = 520;
  const H = 196;
  const PAD = 10;
  const BASE = H - 28;
  const [at, setAt] = useState<number | null>(null);

  const x = (yr: number) => PAD + (yr / years) * (W - PAD * 2);
  const y = (v: number) => BASE * (1 - v / loan);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const yr = (i / 60) * years;
      const b = balanceAt(loan, rate, years, yr * 12);
      pts.push(`${i ? "L" : "M"}${x(yr).toFixed(1)} ${y(b).toFixed(1)}`);
    }
    return pts.join(" ");
    // x and y are pure functions of the props below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan, rate, years]);

  const area = `${curve} L${x(years).toFixed(1)} ${BASE} L${PAD} ${BASE} Z`;
  const ticks = Array.from({ length: Math.floor(years / 5) + 1 }, (_, i) => i * 5).filter((t) => t <= years);
  const bal = at !== null ? balanceAt(loan, rate, years, at * 12) : 0;

  return (
    <figure className="fc-curve mt-9">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setAt(Math.max(0, Math.min(years, Math.round(((px - PAD) / (W - PAD * 2)) * years))));
        }}
        onPointerLeave={() => setAt(null)}
      >
        <defs>
          <linearGradient id="fcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GOLD} stopOpacity="0.26" />
            <stop offset="1" stopColor={GOLD} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={BASE} x2={x(t)} y2={BASE + 4} stroke="rgba(242,237,230,0.2)" strokeWidth="1" />
            <text x={x(t)} y={H - 8} textAnchor="middle" className="fc-t">{t}</text>
          </g>
        ))}
        <line x1={PAD} y1={BASE} x2={W - PAD} y2={BASE} stroke="rgba(242,237,230,0.16)" strokeWidth="1" />

        {/* what you would owe if none of it were interest */}
        <line x1={x(0)} y1={y(loan)} x2={x(years)} y2={y(0)} stroke="rgba(242,237,230,0.3)" strokeWidth="1" strokeDasharray="4 4" />

        {/* what you actually owe */}
        <path d={area} fill="url(#fcFill)" />
        <path d={curve} fill="none" stroke={GOLD} strokeWidth="1.7" />

        {at !== null && (
          <g>
            <line x1={x(at)} y1={4} x2={x(at)} y2={BASE} stroke="rgba(242,237,230,0.28)" strokeWidth="1" />
            <circle cx={x(at)} cy={y(bal)} r="3.6" fill={STONE} />
            <text
              x={Math.min(Math.max(x(at), 76), W - 76)}
              y={Math.max(y(bal) - 13, 13)}
              textAnchor="middle"
              className="fc-t fc-t--read"
            >
              {`po ${at} r. zostáva ${eur(bal)} €`}
            </text>
          </g>
        )}
      </svg>

      <figcaption className="fc-cap">
        <span><i style={{ background: GOLD }} /> koľko ešte dlžíte</span>
        <span><i className="fc-dash" /> keby ste neplatili úroky</span>
        <span className="fc-price">byt {eur(price)} €</span>
      </figcaption>
    </figure>
  );
}

function Fig({ label, value, tone = STONE }: { label: string; value: string; tone?: string }) {
  return (
    <div className="py-4" style={{ borderTop: "1px solid rgba(242,237,230,0.12)" }}>
      <dt className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.42)" }}>{label.toUpperCase()}</dt>
      <dd className="mt-1.5" style={{ fontFamily: "var(--font-cormorant)", fontSize: "23px", fontWeight: 300, color: tone, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </dd>
    </div>
  );
}

/**
 * The years handle looks as though it only lowers the monthly figure. It does
 * not: it also decides what the borrowing costs, and by tens of thousands. So it
 * is priced, in money, against the alternative the visitor is actually weighing.
 */
function Tradeoff({ loan, rate, years, interest, pay }: { loan: number; rate: number; years: number; interest: number; pay: number }) {
  const alt = years >= 25 ? 20 : 30;
  const altPay = monthly(loan, rate, alt);
  const altInterest = altPay * alt * 12 - loan;
  const cheaper = altInterest < interest;

  return (
    <p className="fc-note mt-7">
      Pri <b>{alt} rokoch</b> zaplatíte na úrokoch{" "}
      <b style={{ color: cheaper ? GREEN : GOLD }}>
        o {eur(Math.abs(interest - altInterest))} € {cheaper ? "menej" : "viac"}
      </b>
      , mesačne však o <b>{eur(Math.abs(altPay - pay))} €</b> {cheaper ? "viac" : "menej"}.
    </p>
  );
}
