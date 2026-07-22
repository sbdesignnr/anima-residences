"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";
import { COMPANY } from "@/components/ui/Footer";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GOLD = "#B69A78";
const STONE = "#F2EDE6";

/**
 * The home page's closing ask.
 *
 * The form itself now lives on /kontakt, where it has room for the things a
 * real enquiry needs — the subject, the unit, the consent, the office hours,
 * the way here. Two forms saying the same thing in two places is one form too
 * many, and the one on the home page was always the worse of the pair.
 */
export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const enter = { trigger: sectionRef.current, start: "top 74%" };
      gsap.fromTo(
        ".cn-reveal",
        { yPercent: 118, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: "power3.out", scrollTrigger: enter }
      );
      gsap.fromTo(
        ".cn-fact",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 62%" } }
      );
      gsap.fromTo(
        ".cn-rule",
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left center", duration: 1.2, ease: "power3.out", scrollTrigger: enter }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#1C1C1A", color: STONE }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(110% 80% at 20% 0%, rgba(182,154,120,0.13) 0%, rgba(182,154,120,0) 58%)" }}
      />

      <div className="relative mx-auto max-w-[1400px] px-[6%] py-28 md:py-40">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div style={{ overflow: "hidden" }}>
              <div className="cn-reveal">
                <SheetRef label="Kontakt" />
              </div>
            </div>

            <h2
              className="mt-8"
              style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(38px, 5.4vw, 84px)", fontWeight: 300, lineHeight: 1.02, letterSpacing: "-0.015em" }}
            >
              <span style={{ display: "block", overflow: "hidden" }}>
                <span className="cn-reveal" style={{ display: "block" }}>Byt sa nevyberá</span>
              </span>
              <span style={{ display: "block", overflow: "hidden" }}>
                <span className="cn-reveal" style={{ display: "block", color: "rgba(242,237,230,0.5)" }}>z obrazovky.</span>
              </span>
            </h2>

            <div style={{ overflow: "hidden" }}>
              <p
                className="cn-reveal mt-8 max-w-[460px]"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(242,237,230,0.68)" }}
              >
                Pôdorys povie, koľko má byt metrov. Nepovie, ako doň ráno padá
                svetlo. Prejdeme si ho s vami — nezáväzne, aj cez víkend.
              </p>
            </div>

            <div style={{ overflow: "hidden" }}>
              <Link href="/kontakt" className="cn-cta group mt-12">
                <span className="annot" style={{ fontSize: "11px", fontWeight: 500 }}>
                  DOHODNÚŤ OBHLIADKU
                </span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)" }}>
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* the three things somebody who is ready actually needs */}
          <div>
            <div className="cn-rule h-px w-full" style={{ backgroundColor: "rgba(242,237,230,0.15)" }} />
            <dl>
              <Fact head="Telefón">
                <a href={`tel:${COMPANY.phoneHref}`} className="cn-link">{COMPANY.phone}</a>
              </Fact>
              <Fact head="E-mail">
                <a href={`mailto:${COMPANY.email}`} className="cn-link">{COMPANY.email}</a>
              </Fact>
              <Fact head="Predajná kancelária">
                <a href={COMPANY.mapHref} target="_blank" rel="noopener noreferrer" className="cn-link">
                  {COMPANY.street}, {COMPANY.city}
                </a>
                <span className="block" style={{ color: "rgba(242,237,230,0.45)", marginTop: 4 }}>
                  Po – Pia · 9:00 – 17:00
                </span>
              </Fact>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div className="cn-fact flex flex-col gap-1.5 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8" style={{ borderBottom: "1px solid rgba(242,237,230,0.1)" }}>
      <dt className="annot" style={{ fontSize: "9px", color: GOLD, flexShrink: 0 }}>
        {head.toUpperCase()}
      </dt>
      <dd
        className="sm:text-right"
        style={{ fontFamily: "var(--font-dm-sans)", fontSize: "var(--fs-body)", fontWeight: 300, lineHeight: 1.8, color: "rgba(242,237,230,0.85)" }}
      >
        {children}
      </dd>
    </div>
  );
}
