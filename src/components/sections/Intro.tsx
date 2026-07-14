"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SheetRef } from "@/components/ui/brand";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CHARCOAL = "#1C1C1A";

const STATS = [
  { to: 12, suffix: "", label: "BYTOV", group: false },
  { to: 4, suffix: "", label: "PODLAŽIA", group: false },
  { to: 1200, suffix: " m²", label: "ZELENE", group: true },
  // A year is never thousands-separated.
  { to: 2027, suffix: "", label: "KOLAUDÁCIA", group: false },
];

const fmt = (n: number, group: boolean) =>
  group ? n.toLocaleString("sk-SK") : String(n);

export default function Intro() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const trigger = { trigger: sectionRef.current, start: "top 72%" };

      gsap.fromTo(
        ".intro-reveal",
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, stagger: 0.08, ease: "power3.out", scrollTrigger: trigger }
      );

      gsap.fromTo(
        ".intro-rule",
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left center", duration: 1.2, ease: "power3.out", scrollTrigger: trigger }
      );

      // Count the figures up as the section arrives.
      gsap.utils.toArray<HTMLElement>(".intro-stat").forEach((el) => {
        const to = Number(el.dataset.to);
        const suffix = el.dataset.suffix ?? "";
        const group = el.dataset.group === "true";
        const proxy = { v: 0 };
        let last = -1;
        gsap.to(proxy, {
          v: to,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 65%" },
          onUpdate: () => {
            // Writing the same string still invalidates layout; skip no-ops.
            const n = Math.round(proxy.v);
            if (n === last) return;
            last = n;
            el.textContent = fmt(n, group) + suffix;
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="intro"
      className="relative w-full"
      style={{ backgroundColor: "#F2EDE6", color: CHARCOAL }}
    >
      <div className="mx-auto max-w-[1400px] px-[6%] py-28 md:py-40">
        {/* index row */}
        <div className="flex items-baseline justify-between">
          <Mask>
            <SheetRef label="O projekte" color="rgba(28,28,26,0.5)" />
          </Mask>
          <Mask>
            <p className="annot" style={{ fontSize: "10px", color: "rgba(28,28,26,0.4)" }}>
              NITRA
            </p>
          </Mask>
        </div>

        {/* statement */}
        <h2
          className="mt-14 max-w-[900px]"
          style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(34px, 4.6vw, 76px)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.01em" }}
        >
          <Mask>
            <span className="block">Dvanásť bytov.</span>
          </Mask>
          <Mask>
            <span className="block">Jedna tichá ulica</span>
          </Mask>
          <Mask>
            <span className="block" style={{ color: "rgba(28,28,26,0.45)" }}>v srdci Nitry.</span>
          </Mask>
        </h2>

        <div className="intro-rule mt-16 h-px w-full" style={{ backgroundColor: "rgba(28,28,26,0.15)" }} />

        {/* copy + figures */}
        <div className="mt-16 grid gap-16 lg:grid-cols-2">
          <Mask>
            <p
              className="max-w-[440px]"
              style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, lineHeight: 2.1, letterSpacing: "0.02em", color: "rgba(28,28,26,0.7)" }}
            >
              Anima Residences nevznikla z tabuľky. Vznikla z otázky, ako sa v byte
              naozaj žije — kde ráno dopadá svetlo, kadiaľ prechádza vzduch, čo vidíte,
              keď zdvihnete oči od stola. Štyri podlažia, dvanásť bytov, žiadny z nich
              rovnaký. Vnútorný dvor zostáva zelený, pretože ticho je tiež materiál.
            </p>
          </Mask>

          <dl className="grid grid-cols-2 gap-x-10 gap-y-12">
            {STATS.map((s) => (
              <div key={s.label}>
                <Mask>
                  <dd
                    className="intro-stat"
                    data-to={s.to}
                    data-suffix={s.suffix}
                    data-group={String(s.group)}
                    style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(40px, 4vw, 64px)", fontWeight: 300, lineHeight: 1 }}
                  >
                    0
                  </dd>
                </Mask>
                <Mask>
                  <dt className="mt-3" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "9px", letterSpacing: "0.4em", color: "rgba(28,28,26,0.45)" }}>
                    {s.label}
                  </dt>
                </Mask>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** Clips its child so GSAP can slide it up into view. */
function Mask({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <div className="intro-reveal">{children}</div>
    </div>
  );
}
