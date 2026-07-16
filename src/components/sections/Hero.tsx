"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import media from "@/lib/media.json";
import WaveCanvas from "@/components/ui/WaveCanvas";
import { createBolt, type Bolt } from "@/lib/heroBolt";

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
  const boltRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  /** One origin for both plaster halves, so they render the same living field. */
  const [start] = useState(() => (typeof performance !== "undefined" ? performance.now() : 0));
  const bolt = useRef<Bolt | null>(null);

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

      if (boltRef.current && !bolt.current) bolt.current = createBolt(boltRef.current);
      bolt.current?.start();
      const onResize = () => bolt.current?.resize();
      window.addEventListener("resize", onResize);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const spark = { v: 0 };
      const setSpark = () => bolt.current?.setIntensity(spark.v);

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
        // 1) THE SPARK — the seam flashes gold, then discharges as it opens. A
        //    full-screen flash cracks twice, like a real strike lighting the scene.
        tl.to(spark, { v: 1, ease: "power2.in", duration: 0.08, onUpdate: setSpark }, 0)
          .to(spark, { v: 0.35, ease: "power1.out", duration: 0.14, onUpdate: setSpark }, 0.08)
          .to(spark, { v: 0, ease: "power2.out", duration: 0.26, onUpdate: setSpark }, 0.22)
          .fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.85, ease: "power2.in", duration: 0.035 }, 0.03)
          .to(flashRef.current, { opacity: 0, ease: "power2.out", duration: 0.11 }, 0.065)
          .fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.5, ease: "power2.in", duration: 0.025 }, 0.2)
          .to(flashRef.current, { opacity: 0, ease: "power2.out", duration: 0.1 }, 0.225)
          .to(seamRef.current, { opacity: 0, ease: "power1.out", duration: 0.12 }, 0.05)
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
        bolt.current?.stop();
        window.removeEventListener("resize", onResize);
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
        <WaveCanvas className="hero-bg-canvas" startTime={start} />
        <div className="hero-bg-fallback" />
        <div className="hero-word-top">
          <span className="hw-line hw-anima">ANIMA</span>
        </div>
      </div>

      {/* z2 — the bottom half, carrying RESIDENCES downward */}
      <div ref={bottomRef} className="hero-half hero-half--bottom" aria-hidden>
        <WaveCanvas className="hero-bg-canvas" startTime={start} />
        <div className="hero-bg-fallback" />
        <div className="hero-word-bottom">
          <span className="hw-sub">
            <span className="hw-rule" />
            <span className="hw-line hw-res">RESIDENCES</span>
            <span className="hw-rule" />
          </span>
        </div>
      </div>

      {/* z3 — the seam: a gold hairline at rest, the lightning on scroll */}
      <div ref={seamRef} className="hero-seamline" aria-hidden />
      <canvas ref={boltRef} className="hero-bolt" aria-hidden />

      {/* z5 — the flash the strike throws across the whole hero */}
      <div ref={flashRef} className="hero-flash" style={{ opacity: 0 }} aria-hidden />

      {/* Nav legibility */}
      <div className="hero-topscrim" aria-hidden />
    </section>
  );
}
