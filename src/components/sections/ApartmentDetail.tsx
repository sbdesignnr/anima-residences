"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArchMark, SheetRef } from "@/components/ui/brand";
import {
  planFor,
  polyStr,
  unitCopy,
  type Apartment,
  type Floor,
} from "@/lib/building";
import galleryData from "@/lib/gallery.json";

const GOLD = "#B69A78";
const STONE = "#F2EDE6";
const GREEN = "#86926A";
const RED = "#9C6B5C";
const INK = "#101109";

type Shot = { src: string; avif: string; webp: string; lqip: string; width: number; height: number };
const GALLERY = galleryData as Record<string, Shot[]>;

/* ────────────────────────────── gallery ────────────────────────────── */

function Gallery({ apartment }: { apartment: Apartment }) {
  const shots = GALLERY[apartment.id] ?? [];
  // No effect resets `i` when the apartment changes — the call site gives this
  // component a key, so React discards it and builds a fresh one. That is both
  // the idiomatic answer and the correct one: an effect would render the new
  // apartment's gallery at the OLD index for one frame before correcting itself.
  const [i, setI] = useState(0);

  useEffect(() => {
    if (shots.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => (v + 1) % shots.length);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + shots.length) % shots.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shots.length]);

  // No photography yet — say so honestly, and keep the frame in the design.
  if (shots.length === 0) {
    return (
      <div
        className="relative flex w-full flex-col items-center justify-center gap-5"
        style={{
          aspectRatio: "3 / 2",
          background: "rgba(182,154,120,0.04)",
          border: "1px solid rgba(182,154,120,0.22)",
        }}
      >
        <ArchMark size={26} color={GOLD} />
        <p className="annot text-center" style={{ fontSize: 10, color: "rgba(242,237,230,0.45)", lineHeight: 2 }}>
          FOTOGRAFIE INTERIÉRU
          <br />
          PRIPRAVUJEME
        </p>
      </div>
    );
  }

  const shot = shots[i];

  return (
    <div>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 2", background: "#0b0c07" }}>
        <Image
          key={shot.src}
          src={shot.src}
          alt={`Byt ${apartment.id} — fotografia ${i + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          placeholder="blur"
          blurDataURL={shot.lqip}
          style={{ objectFit: "cover" }}
        />

        {shots.length > 1 && (
          <>
            <button
              aria-label="Predchádzajúca fotografia"
              onClick={() => setI((v) => (v - 1 + shots.length) % shots.length)}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
              style={{ background: "rgba(16,17,9,0.7)", border: `1px solid ${GOLD}`, color: STONE }}
            >
              ‹
            </button>
            <button
              aria-label="Ďalšia fotografia"
              onClick={() => setI((v) => (v + 1) % shots.length)}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
              style={{ background: "rgba(16,17,9,0.7)", border: `1px solid ${GOLD}`, color: STONE }}
            >
              ›
            </button>
            <span
              className="annot absolute bottom-4 right-4"
              style={{ fontSize: 9, color: STONE, background: "rgba(16,17,9,0.8)", padding: "5px 9px" }}
            >
              {String(i + 1).padStart(2, "0")} / {String(shots.length).padStart(2, "0")}
            </span>
          </>
        )}
      </div>

      {shots.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {shots.map((s, n) => (
            <button
              key={s.src}
              onClick={() => setI(n)}
              className="relative shrink-0"
              style={{
                width: 96,
                aspectRatio: "3 / 2",
                border: `1px solid ${n === i ? GOLD : "rgba(182,154,120,0.2)"}`,
                opacity: n === i ? 1 : 0.55,
              }}
            >
              <Image src={s.src} alt="" fill sizes="96px" placeholder="blur" blurDataURL={s.lqip} style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── detail ─────────────────────────────── */

export default function ApartmentDetail({
  apartment,
  floor,
  siblings,
  onClose,
  onSelect,
}: {
  apartment: Apartment;
  floor: Floor;
  siblings: Apartment[];
  onClose: () => void;
  onSelect: (a: Apartment) => void;
}) {
  const [sent, setSent] = useState(false);
  const copy = unitCopy(floor.id, apartment.unit.letter);
  const plan = planFor(floor.id);
  const free = apartment.stav === "Voľný";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-24 pt-6 md:px-10 md:pb-28 md:pt-10">
      {/* ── top bar ── */}
      <div className="detail-reveal mb-10 flex items-center justify-between gap-4">
        <button
          onClick={onClose}
          className="annot flex items-center gap-3"
          style={{ fontSize: 9, color: STONE }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center"
            style={{ border: "1px solid rgba(255,255,255,0.3)" }}
          >
            ←
          </span>
          SPÄŤ NA PÔDORYS
        </button>

        <p className="annot hidden sm:block" style={{ fontSize: 9, color: "rgba(242,237,230,0.4)" }}>
          ANIMA RESIDENCES / {floor.id} / <span style={{ color: STONE }}>BYT {apartment.id}</span>
        </p>
      </div>

      {/* ── headline ── */}
      <div className="detail-reveal mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <SheetRef label={`Byt ${apartment.id}`} />
          <h3
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(56px, 8vw, 120px)",
              fontWeight: 300,
              lineHeight: 0.9,
              color: STONE,
              marginTop: 16,
            }}
          >
            {apartment.id}
          </h3>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="annot" style={{ fontSize: 10, color: "rgba(242,237,230,0.7)" }}>
              {apartment.dispozicia.toUpperCase()}
            </span>
            <span style={{ width: 1, height: 10, background: "rgba(182,154,120,0.5)" }} />
            <span className="annot" style={{ fontSize: 10, color: "rgba(242,237,230,0.7)" }}>{apartment.vymera}</span>
            <span style={{ width: 1, height: 10, background: "rgba(182,154,120,0.5)" }} />
            <span className="annot" style={{ fontSize: 10, color: "rgba(242,237,230,0.7)" }}>{copy.orientation.toUpperCase()}</span>
            <span className="flex items-center gap-2">
              <span style={{ width: 6, height: 8, borderRadius: "3px 3px 0 0", background: free ? GREEN : RED }} />
              <span className="annot" style={{ fontSize: 10, color: free ? GREEN : RED }}>
                {apartment.stav.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        <div className="text-right">
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: 40, fontWeight: 300, color: STONE }}>
            {apartment.cena}
          </p>
        </div>
      </div>

      <div className="grid gap-16 lg:grid-cols-[1.35fr_1fr]">
        {/* ── left: gallery, story, plan ── */}
        <div>
          <div className="detail-reveal">
            <Gallery key={apartment.id} apartment={apartment} />
          </div>

          <div className="detail-reveal mt-14">
            <p
              className="max-w-[560px]"
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "clamp(20px, 1.8vw, 26px)",
                fontWeight: 300,
                lineHeight: 1.6,
                color: STONE,
              }}
            >
              {copy.lead}
            </p>

            <ul className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {copy.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span style={{ marginTop: 6, width: 5, height: 7, borderRadius: "2.5px 2.5px 0 0", background: GOLD, flexShrink: 0 }} />
                  <span className="annot" style={{ fontSize: 10, lineHeight: 1.9, color: "rgba(242,237,230,0.65)" }}>
                    {f.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* the real drawing, inverted, with this unit picked out */}
          <div className="detail-reveal mt-16">
            <p className="annot mb-5" style={{ fontSize: 9, color: GOLD }}>PÔDORYS · {floor.id}</p>
            <div className="relative w-full max-w-md" style={{ aspectRatio: `${plan.w} / ${plan.h}` }}>
              <Image
                src={plan.img}
                alt={`Pôdorys bytu ${apartment.id}`}
                fill
                sizes="480px"
                style={{ objectFit: "contain", filter: "invert(1)", opacity: 0.6 }}
              />
              <svg viewBox={`0 0 ${plan.w} ${plan.h}`} className="absolute inset-0 h-full w-full">
                <polygon
                  points={polyStr(apartment.unit.poly)}
                  fill={GOLD}
                  fillOpacity={0.16}
                  stroke={GOLD}
                  strokeWidth={4}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── right: specs, siblings, enquiry ── */}
        <div>
          <div className="detail-reveal">
            <p className="annot mb-6" style={{ fontSize: 9, color: GOLD }}>ŠPECIFIKÁCIA</p>
            <dl>
              {(
                [
                  ["Dispozícia", apartment.dispozicia],
                  ["Úžitková plocha", apartment.vymera],
                  ["Podlažie", floor.id],
                  ["Orientácia", copy.orientation],
                  ["Balkón / terasa", apartment.balkon],
                  ["Kobka", apartment.pivnica],
                  ["Parkovanie", `${apartment.parkovanie} · ${apartment.parkovanieCena}`],
                  ["Stav", apartment.stav],
                  ["Cena", apartment.cena],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-6 py-4"
                  style={{ borderBottom: "1px solid rgba(182,154,120,0.16)" }}
                >
                  <dt className="annot" style={{ fontSize: 9, color: "rgba(242,237,230,0.4)" }}>
                    {k.toUpperCase()}
                  </dt>
                  <dd className="annot text-right" style={{ fontSize: 11, color: STONE }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* other units on this floor */}
          <div className="detail-reveal mt-12">
            <p className="annot mb-5" style={{ fontSize: 9, color: GOLD }}>ĎALŠIE BYTY NA {floor.id}</p>
            <div className="flex gap-3">
              {siblings.map((s) => {
                const on = s.id === apartment.id;
                const sFree = s.stav === "Voľný";
                return (
                  <button
                    key={s.id}
                    onClick={() => !on && onSelect(s)}
                    className="flex-1 py-4"
                    style={{
                      border: `1px solid ${on ? GOLD : "rgba(182,154,120,0.25)"}`,
                      background: on ? "rgba(182,154,120,0.12)" : "transparent",
                      cursor: on ? "default" : "pointer",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: 26, fontWeight: 300, color: STONE, display: "block" }}>
                      {s.id}
                    </span>
                    <span className="annot mt-1 block" style={{ fontSize: 8, color: sFree ? GREEN : RED }}>
                      {s.stav.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* enquiry */}
          <div className="detail-reveal mt-12" style={{ border: "1px solid rgba(182,154,120,0.25)", padding: "28px 26px" }}>
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <ArchMark size={22} color={GOLD} />
                <p style={{ fontFamily: "var(--font-cormorant)", fontSize: 30, fontWeight: 300, color: GOLD }}>Ďakujeme</p>
                <p className="annot" style={{ fontSize: 10, color: "rgba(242,237,230,0.5)" }}>
                  OZVEME SA VÁM DO 24 HODÍN
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-5"
              >
                <p className="annot" style={{ fontSize: 9, color: GOLD }}>MÁM ZÁUJEM O BYT {apartment.id}</p>
                <Field name="meno" label="Meno a priezvisko" type="text" />
                <Field name="email" label="E-mail" type="email" />
                <Field name="telefon" label="Telefón" type="tel" required={false} />
                <div>
                  <label htmlFor="sprava" style={labelStyle}>Správa</label>
                  <textarea id="sprava" name="sprava" rows={3} style={inputStyle} />
                </div>
                <button
                  type="submit"
                  className="annot w-full"
                  style={{ fontSize: 10, color: INK, background: GOLD, padding: "16px 0", border: `1px solid ${GOLD}` }}
                >
                  ODOSLAŤ DOPYT
                </button>
                <p className="annot" style={{ fontSize: 8, color: "rgba(242,237,230,0.3)", lineHeight: 1.9 }}>
                  ALEBO VOLAJTE +421 948 341 154
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontFamily: "var(--font-dm-sans)",
  fontSize: 9,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "rgba(242,237,230,0.45)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "14px 16px",
  fontFamily: "var(--font-dm-sans)",
  fontSize: 12,
  color: STONE,
  outline: "none",
};

function Field({ name, label, type, required = true }: { name: string; label: string; type: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <input id={name} name={name} type={type} required={required} style={inputStyle} />
    </div>
  );
}
