"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import media from "@/lib/media.json";
import WaveCanvas, { type WaveHandle } from "@/components/ui/WaveCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const isPhone = () => window.matchMedia("(max-width: 767px)").matches;
const HERO_MOBILE = media.heroMobile;
const MOBILE_FILL = HERO_MOBILE.w / HERO_MOBILE.h <= 0.62;

const SOURCES: { src: string; type: string; media: string }[] = [
  { src: "/videos/hero-mobile.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(max-width: 767px)" },
  { src: "/videos/hero-mobile.mp4", type: "video/mp4", media: "(max-width: 767px)" },
  { src: "/videos/hero-desktop.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(min-width: 768px)" },
  { src: "/videos/hero-desktop.mp4", type: "video/mp4", media: "(min-width: 768px)" },
];

const posterFor = () =>
  isPhone() ? "/images/hero-poster-mobile.avif" : "/images/hero-poster.avif";

/** The share of the pinned scroll spent on the opening, before the film holds. */
const INTRO = 0.72;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const waveTop = useRef<WaveHandle>(null);
  const waveBottom = useRef<WaveHandle>(null);
  /** One origin for both plaster halves, so they render the same living field. */
  const [start] = useState(() => (typeof performance !== "undefined" ? performance.now() : 0));

  // ── Load: the wordmark settles onto the plaster ──
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set(".hw-line", { opacity: 1, y: 0 });
        gsap.set(".hw-rule", { scaleX: 1 });
        return;
      }
      gsap
        .timeline({ delay: 0.2 })
        .fromTo(".hw-anima", { opacity: 0, y: 30, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power3.out" }, 0)
        .fromTo(".hw-res", { opacity: 0, y: -18, filter: "blur(5px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, 0.15)
        .fromTo(".hw-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: "power4.inOut" }, 0.45)
        .fromTo(seamRef.current, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power2.out" }, 0.5);
    },
    { scope: heroRef }
  );

  // ── Scroll: the seam sparks, the plaster splits, the film is revealed ──
  useGSAP(
    () => {
      const video = videoRef.current;
      const sec = heroRef.current;
      if (!video || !sec) return;

      video.poster = posterFor();
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      const play = () => {
        const p = video.play();
        if (p) p.catch(() => {});
      };
      play();

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const glow = { v: 0 };
      const setGlow = () => {
        waveTop.current?.setGlow(glow.v);
        waveBottom.current?.setGlow(glow.v);
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => "+=" + window.innerHeight * (isCoarse() ? 1.6 : 2),
          scrub: 0.7,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            if (self.isActive) play();
          },
        },
      });

      if (reduce) {
        tl.to([topRef.current], { yPercent: -100, ease: "none", duration: 1 }, 0)
          .to([bottomRef.current], { yPercent: 100, ease: "none", duration: 1 }, 0)
          .to(seamRef.current, { opacity: 0, ease: "none", duration: 0.3 }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.26, ease: "none", duration: 1 }, 0);
      } else {
        // 1) THE PLASTER QUICKENS — as the opening begins, the living field's gold
        //    veins brighten and the shimmer runs faster (uGlow), then eases back
        //    as the halves fly off. No flash — just the plaster coming alive.
        tl.to(glow, { v: 1, ease: "power2.out", duration: 0.34, onUpdate: setGlow }, 0.02)
          .to(glow, { v: 0.4, ease: "sine.inOut", duration: 0.3, onUpdate: setGlow }, 0.42)
          .to(seamRef.current, { opacity: 0, ease: "power1.out", duration: 0.16 }, 0.05)
          // 2) THE OPENING — the plaster parts from the centre; ANIMA rises,
          //    RESIDENCES descends, and the film widens between them.
          .to(topRef.current, { yPercent: -102, ease: "power2.in", duration: INTRO }, 0.05)
          .to(bottomRef.current, { yPercent: 102, ease: "power2.in", duration: INTRO }, 0.05)
          .fromTo(videoRef.current, { scale: 1.12 }, { scale: 1, ease: "power2.out", duration: INTRO + 0.1 }, 0.05)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.26, ease: "none", duration: 0.4 }, INTRO * 0.55)
          // 3) hold on the film for the rest of the pin
          .to({}, { duration: 1 - INTRO }, INTRO);
      }

      const onLoaded = () => {
        play();
        ScrollTrigger.refresh();
      };
      if (video.readyState >= 1) onLoaded();
      video.addEventListener("loadedmetadata", onLoaded);
      const onGesture = () => play();
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("touchstart", onGesture, { once: true });

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("touchstart", onGesture);
      };
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      id="hero"
      className={`relative w-full overflow-hidden bg-charcoal ${MOBILE_FILL ? "hero--fill" : "hero--letterbox"}`}
      style={{ height: "100svh", ["--m-aspect" as string]: `${HERO_MOBILE.w} / ${HERO_MOBILE.h}` }}
    >
      <link rel="preload" as="image" href="/images/hero-poster.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-poster-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />

      <h1 className="sr-only">Anima Residences</h1>

      {/* z1 — the film (with its grade), revealed as the plaster parts */}
      <div className="hero-openfilm" aria-hidden>
        <video ref={videoRef} className="hero-openvid" autoPlay muted loop playsInline controls={false} preload="auto" aria-hidden>
          {SOURCES.map((s) => (
            <source key={s.src} src={s.src} type={s.type} media={s.media} />
          ))}
        </video>
        <div className="cine-vignette" aria-hidden />
        <div ref={grainRef} className="cine-grain" style={{ opacity: 0 }} aria-hidden />
      </div>

      {/* z2 — the top half of the plaster, carrying ANIMA upward */}
      <div ref={topRef} className="hero-half hero-half--top" aria-hidden>
        <WaveCanvas ref={waveTop} className="hero-bg-canvas" startTime={start} />
        <div className="hero-bg-fallback" />
        <div className="hero-word-top">
          <span className="hw-line hw-anima">ANIMA</span>
        </div>
      </div>

      {/* z2 — the bottom half, carrying RESIDENCES downward */}
      <div ref={bottomRef} className="hero-half hero-half--bottom" aria-hidden>
        <WaveCanvas ref={waveBottom} className="hero-bg-canvas" startTime={start} />
        <div className="hero-bg-fallback" />
        <div className="hero-word-bottom">
          <span className="hw-sub">
            <span className="hw-rule" />
            <span className="hw-line hw-res">RESIDENCES</span>
            <span className="hw-rule" />
          </span>
        </div>
      </div>

      {/* z3 — the seam: a gold hairline that gives way as the plaster opens */}
      <div ref={seamRef} className="hero-seamline" aria-hidden />

      {/* Nav legibility */}
      <div className="hero-topscrim" aria-hidden />
    </section>
  );
}
