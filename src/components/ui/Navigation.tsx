"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArchMark } from "@/components/ui/brand";

const BRASS = "#B69A78";
const STONE = "#F2EDE6";

// Root-relative so every link also works from a subpage (e.g. /financovanie):
// next/link navigates home and scrolls to the anchor.
const LINKS = [
  { label: "Projekt", href: "/#building" },
  { label: "Vybavenie", href: "/#amenities" },
  { label: "Financovanie", href: "/financovanie" },
  { label: "Harmonogram", href: "/#timeline" },
  { label: "Kontakt", href: "/kontakt" },
];

export default function Navigation() {
  const navRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page while the drawer is open.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useGSAP(
    () => {
      gsap.fromTo(
        ".nav-anim",
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.08, delay: 0.3 }
      );
    },
    { scope: navRef }
  );

  useGSAP(
    () => {
      if (!drawerRef.current) return;
      if (open) {
        gsap
          .timeline()
          .set(drawerRef.current, { display: "flex" })
          .fromTo(drawerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" })
          .fromTo(
            ".drawer-item",
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: "power3.out" },
            0.1
          );
      } else {
        gsap.to(drawerRef.current, {
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => gsap.set(drawerRef.current, { display: "none" }),
        });
      }
    },
    { dependencies: [open] }
  );

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        // No backdrop-filter: a fixed, full-width blur is re-sampled and
        // re-blurred on every scrolled frame. At 0.92 alpha over dark footage
        // it is visually indistinguishable and costs nothing.
        backgroundColor: scrolled || open ? "rgba(24,25,19,0.92)" : "transparent",
        transition: "background-color 0.3s ease",
      }}
    >
      <div
        className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:h-[72px] md:px-8"
        style={{ padding: undefined }}
      >
        {/* 460 KB PNG -> 15 KB AVIF. <picture> keeps it a plain <img>, so no
            phantom baseline gap and no next/image layout wrapper. */}
        <Link href="/" aria-label="Anima Residences — domov" className="nav-anim">
          <picture>
            <source srcSet="/images/logo_simon.avif" type="image/avif" />
            <source srcSet="/images/logo_simon.webp" type="image/webp" />
            <img
              src="/images/logo_simon.png"
              alt="Anima Residences"
              width={440}
              height={152}
              style={{ height: "38px", width: "auto", display: "block" }}
            />
          </picture>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-10 lg:flex">
          {LINKS.map((link) => (
            <li key={link.href} className="nav-anim">
              <Link
                href={link.href}
                className="annot uppercase text-white transition-colors duration-300 hover:text-gold"
                style={{ fontSize: "11px", fontWeight: 300 }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/#contact"
          className="nav-anim annot hidden uppercase text-white transition-colors duration-300 hover:border-gold lg:inline-block"
          style={{
            fontSize: "10px",
            fontWeight: 300,
            padding: "12px 24px",
            border: "1px solid rgba(255,255,255,0.4)",
          }}
        >
          Rezervovať
        </Link>

        {/* Phone: burger — two hairlines, no icon font */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Zavrieť menu" : "Otvoriť menu"}
          aria-expanded={open}
          className="nav-anim flex h-10 w-10 flex-col items-center justify-center gap-[6px] lg:hidden"
        >
          <span
            style={{
              display: "block", width: "22px", height: "1px", backgroundColor: STONE,
              transition: "transform 0.3s ease",
              transform: open ? "translateY(3.5px) rotate(45deg)" : "none",
            }}
          />
          <span
            style={{
              display: "block", width: "22px", height: "1px", backgroundColor: STONE,
              transition: "transform 0.3s ease, opacity 0.3s ease",
              transform: open ? "translateY(-3.5px) rotate(-45deg)" : "none",
            }}
          />
        </button>
      </div>

      {/* Phone drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-0 top-16 hidden flex-col justify-between px-6 pb-12 pt-10 lg:!hidden"
        style={{ backgroundColor: "#181913", display: "none" }}
      >
        <ul>
          {LINKS.map((link, i) => (
            <li key={link.href} style={{ overflow: "hidden" }}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="drawer-item flex items-baseline gap-5 py-5"
                style={{ borderBottom: "1px solid rgba(182,154,120,0.18)" }}
              >
                <span className="annot" style={{ fontSize: "9px", color: BRASS }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "34px", fontWeight: 300, color: STONE }}>
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="drawer-item flex flex-col items-center gap-6">
          <ArchMark size={22} color={BRASS} />
          <Link
            href="/#contact"
            onClick={() => setOpen(false)}
            className="annot w-full text-center uppercase"
            style={{ fontSize: "11px", color: "#181913", backgroundColor: BRASS, padding: "18px 0" }}
          >
            Rezervovať
          </Link>
        </div>
      </div>
    </nav>
  );
}
