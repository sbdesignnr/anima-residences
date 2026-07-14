"use client";

import { useMemo, useState } from "react";

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

/** Annuity payment: P·r / (1 − (1+r)^−n); falls back to P/n at 0 %. */
function monthly(principal: number, annualPct: number, years: number) {
  const n = years * 12;
  const r = annualPct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

const eur = (n: number, frac = 0) =>
  n.toLocaleString("sk-SK", { minimumFractionDigits: frac, maximumFractionDigits: frac });

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
};

function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="annot" style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", fontWeight: 300, color: STONE }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="hypo-range mt-4 w-full"
        style={{ background: `linear-gradient(to right, ${GOLD} ${pct}%, rgba(242,237,230,0.15) ${pct}%)` }}
      />
    </div>
  );
}

export default function HypoCalc() {
  const [amount, setAmount] = useState(200000);
  const [rate, setRate] = useState(3.9);
  const [years, setYears] = useState(30);

  const pay = useMemo(() => monthly(amount, rate, years), [amount, rate, years]);
  const total = pay * years * 12;
  const overpaid = total - amount;

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
      {/* controls */}
      <div className="flex flex-col gap-9">
        <Slider
          label="VÝŠKA ÚVERU"
          value={amount}
          min={50000}
          max={600000}
          step={5000}
          onChange={setAmount}
          format={(v) => `${eur(v)} €`}
        />
        <Slider
          label="ÚROKOVÁ SADZBA"
          value={rate}
          min={0.5}
          max={7}
          step={0.1}
          onChange={setRate}
          format={(v) => `${v.toLocaleString("sk-SK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`}
        />
        <Slider
          label="DOBA SPLÁCANIA"
          value={years}
          min={5}
          max={35}
          step={1}
          onChange={setYears}
          format={(v) => `${v} rokov`}
        />
      </div>

      {/* result */}
      <div
        className="flex flex-col items-center justify-center px-8 py-12 text-center"
        style={{ border: "1px solid rgba(182,154,120,0.3)", background: "linear-gradient(180deg, rgba(182,154,120,0.08) 0%, rgba(182,154,120,0) 60%)" }}
      >
        <span className="annot" style={{ fontSize: "10px", color: GOLD }}>
          MESAČNÁ SPLÁTKA
        </span>
        <div className="mt-4 flex items-baseline gap-2">
          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(52px, 9vw, 76px)", fontWeight: 300, lineHeight: 1, color: STONE }}>
            {eur(Math.round(pay))}
          </span>
          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "28px", fontWeight: 300, color: "rgba(242,237,230,0.6)" }}>
            €
          </span>
        </div>

        <div className="mt-9 flex w-full items-stretch justify-center gap-8 border-t pt-7" style={{ borderColor: "rgba(242,237,230,0.14)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", fontWeight: 300, color: STONE }}>
              {eur(Math.round(total))} €
            </div>
            <div className="annot mt-1" style={{ fontSize: "9px", color: "rgba(242,237,230,0.45)" }}>
              CELKOM ZAPLATÍTE
            </div>
          </div>
          <div style={{ width: 1, background: "rgba(242,237,230,0.14)" }} />
          <div>
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", fontWeight: 300, color: STONE }}>
              {eur(Math.round(overpaid))} €
            </div>
            <div className="annot mt-1" style={{ fontSize: "9px", color: "rgba(242,237,230,0.45)" }}>
              Z TOHO ÚROKY
            </div>
          </div>
        </div>

        <p className="mt-8 max-w-[300px]" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", fontWeight: 300, lineHeight: 1.7, color: "rgba(242,237,230,0.4)" }}>
          Orientačný výpočet, nie je záväznou ponukou. Presné podmienky pripraví
          váš poradca podľa aktuálnych sadzieb bánk.
        </p>
      </div>
    </div>
  );
}
