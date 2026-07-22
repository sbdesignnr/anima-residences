"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArchMark, SheetRef } from "@/components/ui/brand";
import { COMPANY } from "@/components/ui/Footer";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";
const CHARCOAL = "#1C1C1A";

/** What people actually write to us about. */
const SUBJECTS = ["Obhliadka", "Konkrétny byt", "Financovanie", "Iné"];

type State = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".ct-rise").forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 26, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: (i % 3) * 0.05,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 90%" },
          }
        );
      });
      gsap.utils.toArray<HTMLElement>(".ct-rule").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 94%" } }
        );
      });

    },
    { scope: rootRef }
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, subject }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Správu sa nepodarilo odoslať.");
      }
      setState("sent");
      form.reset();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Správu sa nepodarilo odoslať.");
    }
  };

  return (
    <div ref={rootRef}>

      {/* ── The invitation ── */}
      <section style={{ backgroundColor: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] pb-20 pt-32 md:pb-24 md:pt-44">
          <Link
            href="/"
            className="ct-rise annot inline-flex items-center gap-2 transition-colors duration-300 hover:text-gold"
            style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}
          >
            <span aria-hidden>←</span> SPÄŤ NA ANIMA RESIDENCES
          </Link>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="ct-rise">
                <SheetRef label="Kontakt" />
              </div>
              <h1
                className="ct-rise mt-8"
                style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(44px, 7.2vw, 108px)", fontWeight: 300, lineHeight: 1, letterSpacing: "-0.02em", color: STONE }}
              >
                Príďte sa
                <br />
                <span style={{ color: "rgba(242,237,230,0.45)" }}>pozrieť.</span>
              </h1>
            </div>

            <p
              className="ct-rise max-w-[430px] lg:justify-self-end"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(242,237,230,0.68)" }}
            >
              Pôdorys povie, koľko má byt metrov. Nepovie, ako doň ráno padá
              svetlo. Napíšte nám a prejdeme si ho spolu — nezáväzne, aj cez
              víkend, ak vám to tak vyhovuje.
            </p>
          </div>
        </div>
      </section>

      {/* ── The form, and who picks it up ── */}
      <section style={{ backgroundColor: "#F2EDE6", color: CHARCOAL }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-24 md:py-32">
          <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            {/* form */}
            <div>
              <div className="ct-rise">
                <SheetRef label="Napíšte nám" color="rgba(28,28,26,0.5)" />
              </div>

              {state === "sent" ? (
                <div className="ct-rise mt-10 flex flex-col items-start gap-4 border p-10" style={{ borderColor: "rgba(182,154,120,0.4)", background: "rgba(182,154,120,0.06)" }}>
                  <ArchMark size={26} color={GOLD} />
                  <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "32px", fontWeight: 300 }}>Ďakujeme.</p>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 1.9, color: "rgba(28,28,26,0.7)" }}>
                    Správu máme. Ozveme sa vám do jedného pracovného dňa — a ak to
                    súri, zavolajte rovno na {COMPANY.phone}.
                  </p>
                  <button onClick={() => setState("idle")} className="ct-link mt-2">
                    Napísať znova
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-10">
                  {/* what it is about */}
                  <fieldset className="ct-rise">
                    <legend className="annot" style={{ fontSize: "9px", color: "rgba(28,28,26,0.45)" }}>
                      ČOHO SA TO TÝKA
                    </legend>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {SUBJECTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="ct-chip"
                          data-on={s === subject}
                          onClick={() => setSubject(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="ct-rise mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                    <Field name="name" label="Meno a priezvisko" autoComplete="name" required />
                    <Field name="email" label="E-mail" type="email" autoComplete="email" required />
                    <Field name="phone" label="Telefón" type="tel" autoComplete="tel" hint="nepovinné" />
                    <Field name="unit" label="Byt, ktorý vás zaujal" hint="nepovinné" placeholder="napr. 3NP · B" />
                  </div>

                  <div className="ct-rise mt-8">
                    <Field name="message" label="Správa" textarea />
                  </div>

                  {/* Nobody can see this, so nobody fills it — except a bot. */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="ct-pot" />

                  {/* the consent is not decoration — nothing is sent without it */}
                  <label className="ct-rise ct-consent mt-8">
                    <input type="checkbox" name="consent" required />
                    <span>
                      Súhlasím so spracovaním osobných údajov na účel vybavenia
                      môjho dopytu.{" "}
                      <a href="#osobne-udaje" className="ct-link">Viac</a>
                    </span>
                  </label>

                  {state === "error" && (
                    <p className="mt-6" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12.5px", color: "#9C6B5C" }}>
                      {error}
                    </p>
                  )}

                  <button type="submit" className="ct-submit group mt-10" disabled={state === "sending"}>
                    <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>
                      {state === "sending" ? "ODOSIELAM…" : "ODOSLAŤ DOPYT"}
                    </span>
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)" }}>
                      →
                    </span>
                  </button>
                </form>
              )}
            </div>

            {/* who picks it up, and where they sit */}
            <div className="lg:pl-6">
              <div className="ct-rise">
                <SheetRef label="Informácie" color="rgba(28,28,26,0.5)" />
              </div>

              <dl className="mt-10">
                <Row head="Adresa">
                  <a href={COMPANY.mapHref} target="_blank" rel="noopener noreferrer" className="ct-link" style={{ fontSize: "inherit" }}>
                    {COMPANY.street}, {COMPANY.city}
                  </a>
                </Row>
                <Row head="Telefón">
                  <a href={`tel:${COMPANY.phoneHref}`} className="ct-link" style={{ fontSize: "inherit" }}>{COMPANY.phone}</a>
                </Row>
                <Row head="E-mail">
                  <a href={`mailto:${COMPANY.email}`} className="ct-link" style={{ fontSize: "inherit" }}>{COMPANY.email}</a>
                </Row>
                <Row head="Otváracie hodiny">
                  Po – Pia · 9:00 – 17:00
                  <br />
                  <span style={{ color: "rgba(28,28,26,0.5)" }}>So · po telefonickej dohode</span>
                </Row>
                <Row head="Obhliadky">
                  Priamo na stavbe, po dohode aj mimo otváracích hodín.
                </Row>
              </dl>

            </div>
          </div>
        </div>
      </section>

      {/* ── Where it is ────────────────────────────────────────────────────
             A real map, because "where is it" is a question a drawing cannot
             answer. No API key and no coordinates invented: the address is the
             query, and Google geocodes it. Loaded lazily — it is below the fold
             and it is a third party. ── */}
      <section id="osobne-udaje" style={{ backgroundColor: "#141510", color: STONE }}>
        <div className="mx-auto max-w-[1400px] px-[6%] py-20 md:py-24">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="ct-rise">
              <SheetRef label="Kde nás nájdete" />
            </div>
            <a
              href={COMPANY.mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ct-rise annot transition-colors duration-300 hover:text-gold"
              style={{ fontSize: "10px", color: GOLD }}
            >
              OTVORIŤ V MAPÁCH →
            </a>
          </div>

          <p
            className="ct-rise mt-6"
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 300, color: STONE }}
          >
            {COMPANY.street}
            <span style={{ color: "rgba(242,237,230,0.45)" }}>, {COMPANY.city}</span>
          </p>

          <div className="ct-map ct-rise mt-10">
            <iframe
              src={COMPANY.mapEmbed}
              title={`Mapa — ${COMPANY.query}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <span className="am-tick am-tick--tl" />
            <span className="am-tick am-tick--tr" />
            <span className="am-tick am-tick--bl" />
            <span className="am-tick am-tick--br" />
          </div>

          <p
            className="ct-rise mt-10 max-w-[720px]"
            style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, lineHeight: 2.1, color: "rgba(242,237,230,0.5)" }}
          >
            Údaje z formulára spracúvame výhradne na to, aby sme vám odpovedali na
            dopyt. Neposielame ich tretím stranám a na požiadanie ich vymažeme —
            stačí napísať na {COMPANY.email}.
          </p>
        </div>
      </section>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Field({
  name,
  label,
  type = "text",
  hint,
  placeholder,
  required = false,
  textarea = false,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="ct-field">
      <label htmlFor={name} className="flex items-baseline justify-between">
        <span className="annot" style={{ fontSize: "9px", color: "rgba(28,28,26,0.5)" }}>
          {label.toUpperCase()}
        </span>
        {hint && (
          <span className="annot" style={{ fontSize: "9px", color: "rgba(28,28,26,0.32)" }}>
            {hint.toUpperCase()}
          </span>
        )}
      </label>

      {textarea ? (
        <textarea id={name} name={name} rows={5} className="ct-input" placeholder="O čo presne máte záujem?" />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="ct-input"
        />
      )}
    </div>
  );
}

function Row({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div
      className="ct-rise flex flex-col gap-1.5 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
      style={{ borderTop: "1px solid rgba(28,28,26,0.12)" }}
    >
      <dt className="annot" style={{ fontSize: "9px", color: "rgba(28,28,26,0.45)", flexShrink: 0 }}>
        {head.toUpperCase()}
      </dt>
      <dd
        className="sm:text-right"
        style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 1.85, color: "rgba(28,28,26,0.82)" }}
      >
        {children}
      </dd>
    </div>
  );
}
