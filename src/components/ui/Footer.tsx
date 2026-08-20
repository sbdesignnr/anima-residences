"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { openConsentSettings } from "@/lib/consent";
import { DEVELOPERS } from "@/lib/legal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

/**
 * The project's own particulars, spelled once. The footer, the contact page, the
 * map and every tel:/mailto: link read them from here, so the address changes in
 * one place or it changes nowhere.
 */
export const COMPANY = {
  name: "Anima Residences",
  street: "Smetanova 2",
  city: "949 01 Nitra",
  phone: "+421 948 341 154",
  phoneHref: "+421948341154",
  email: "info@animaresidences.sk",
  /** The address, spelled once — the map, the link and the footer all read it. */
  query: "Smetanova 2, 949 01 Nitra",
  /** Opens the address in whatever map app the visitor actually uses. */
  mapHref: "https://www.google.com/maps/search/?api=1&query=Smetanova%202%2C%20949%2001%20Nitra",
  /** The same address as an embeddable map. No API key, and no coordinates to
      invent — Google geocodes the query itself. */
  mapEmbed:
    "https://www.google.com/maps?q=Smetanova%202%2C%20949%2001%20Nitra&hl=sk&z=16&output=embed",
};

const COLUMNS: { head: string; links: { label: string; href: string }[] }[] = [
  {
    head: "Projekt",
    links: [
      { label: "Ponuka bytov", href: "/#building" },
      { label: "Vybavenie projektu", href: "/#amenities" },
      { label: "Harmonogram", href: "/#timeline" },
    ],
  },
  {
    head: "Kúpa",
    links: [
      { label: "Financovanie", href: "/financovanie" },
      { label: "Hypokalkulačka", href: "/financovanie#kalkulacka" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
];

export default function Footer() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const enter = { trigger: rootRef.current, start: "top 88%" };

      gsap.fromTo(
        ".ft-rule",
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left center", duration: 1.2, ease: "power3.out", scrollTrigger: enter }
      );
      gsap.fromTo(
        ".ft-col",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: enter }
      );
    },
    { scope: rootRef }
  );

  const toTop = () =>
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  return (
    <footer ref={rootRef} className="ft">
      {/* the same drafting grid the sheets are pinned to, inverted */}
      <div className="ft-grid" aria-hidden />

      <div className="relative mx-auto max-w-[1400px] px-[6%] pt-24 pb-10 md:pt-32">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ── the invitation ── */}
          <div className="ft-col">
            {/* The mark the header already uses — 460 KB PNG behind a 15 KB AVIF. */}
            <picture>
              <source srcSet="/images/logo_simon.avif" type="image/avif" />
              <source srcSet="/images/logo_simon.webp" type="image/webp" />
              <img
                src="/images/logo_simon.png"
                alt="Anima Residences"
                width={440}
                height={152}
                style={{ height: "46px", width: "auto", display: "block" }}
              />
            </picture>
            <p
              className="mt-7 max-w-[420px]"
              style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(26px, 2.6vw, 36px)", fontWeight: 300, lineHeight: 1.25, color: STONE }}
            >
              Príďte sa pozrieť.
              <span style={{ color: "rgba(242,237,230,0.45)" }}> Byt sa nevyberá z obrazovky.</span>
            </p>

            <Link href="/kontakt" className="ft-cta group mt-9">
              <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>
                DOHODNÚŤ OBHLIADKU
              </span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)" }}>
                →
              </span>
            </Link>
          </div>

          {/* ── where to find us, and how ── */}
          <div className="ft-col grid gap-10 sm:grid-cols-2">
            {COLUMNS.map((c) => (
              <nav key={c.head}>
                <p className="annot" style={{ fontSize: "9px", color: GOLD }}>
                  {c.head.toUpperCase()}
                </p>
                <ul className="mt-5 flex flex-col gap-3.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="ft-link">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="ft-rule mt-16 h-px w-full" style={{ backgroundColor: "rgba(242,237,230,0.14)" }} />

        {/* ── the particulars ── */}
        <div className="ft-col mt-9 grid gap-8 sm:grid-cols-3">
          <Fact head="Adresa">
            <a href={COMPANY.mapHref} target="_blank" rel="noopener noreferrer" className="ft-plain">
              {COMPANY.street}
              <br />
              {COMPANY.city}
            </a>
          </Fact>
          <Fact head="Telefón">
            <a href={`tel:${COMPANY.phoneHref}`} className="ft-plain">
              {COMPANY.phone}
            </a>
          </Fact>
          <Fact head="E-mail">
            <a href={`mailto:${COMPANY.email}`} className="ft-plain">
              {COMPANY.email}
            </a>
          </Fact>
        </div>

        {/* ── the developer(s) / billing particulars ── */}
        <div className="ft-col mt-10">
          <p className="annot" style={{ fontSize: "9px", color: GOLD }}>
            {DEVELOPERS.length > 1 ? "DEVELOPERI" : "DEVELOPER"}
          </p>
          <div className="mt-3 grid gap-x-12 gap-y-8 sm:grid-cols-2" style={{ maxWidth: "860px" }}>
            {DEVELOPERS.map((d) => (
              <div key={d.ico}>
                {d.logo && (
                  <picture>
                    <source srcSet={`${d.logo}.avif`} type="image/avif" />
                    <source srcSet={`${d.logo}.webp`} type="image/webp" />
                    <img
                      src={`${d.logo}.png`}
                      alt={d.name}
                      width={405}
                      height={139}
                      style={{ height: "34px", width: "auto", display: "block", marginBottom: "14px", opacity: 0.9 }}
                    />
                  </picture>
                )}
                <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 300, fontSize: "13px", lineHeight: 1.95, color: "rgba(242,237,230,0.62)" }}>
                  <span style={{ color: "rgba(242,237,230,0.9)" }}>{d.name}</span>
                  {" · "}
                  {d.seat}
                  <br />
                  IČO {d.ico} · DIČ {d.dic}
                  {d.icDph && ` · IČ DPH ${d.icDph}`}
                  <br />
                  {d.register}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── the small print ── */}
        <div className="mt-16 flex flex-col gap-5 border-t pt-7 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(242,237,230,0.1)" }}>
          <div>
            <p className="annot" style={{ fontSize: "9px", lineHeight: 2, color: "rgba(242,237,230,0.36)" }}>
              © 2026 Anima Residences. Všetky práva vyhradené.
            </p>
            <p className="annot" style={{ fontSize: "9px", lineHeight: 2, color: "rgba(242,237,230,0.3)" }}>
              Web vytvoril{" "}
              <a href="https://www.sbdesign.sk" target="_blank" rel="noopener noreferrer" className="ft-credit">
                SB Design
              </a>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href="/ochrana-osobnych-udajov" className="ft-fine">
              Ochrana osobných údajov
            </Link>
            <Link href="/cookies" className="ft-fine">
              Cookies
            </Link>
            <button onClick={openConsentSettings} className="ft-fine" type="button">
              Nastavenia cookies
            </button>
            <button onClick={toTop} className="ft-top group" aria-label="Späť hore">
              <span className="annot" style={{ fontSize: "9px" }}>HORE</span>
              <span aria-hidden className="ft-top-arrow" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Fact({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.4)" }}>
        {head.toUpperCase()}
      </p>
      <p
        className="mt-2.5"
        style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 1.85, color: "rgba(242,237,230,0.82)" }}
      >
        {children}
      </p>
    </div>
  );
}
