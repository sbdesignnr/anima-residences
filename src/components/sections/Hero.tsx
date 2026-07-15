"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import lqip from "@/lib/lqip.json";
import media from "@/lib/media.json";
import WaveCanvas, { type WaveHandle } from "@/components/ui/WaveCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const LQIP_BG: React.CSSProperties = {
  backgroundImage: `url(${lqip["hero-poster"].lqip})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const VIDEO_FPS = 12;
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

/** The share of the pinned scroll the dive-into-the-I takes before the film runs. */
const INTRO = 0.42;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLElement>(null);
  const waveRef = useRef<WaveHandle>(null);
  /** The I-window is shut at rest (0) — the opening is a clean white ANIMA,
      and the film grows out of the I only as the dive begins. */
  const restMi = useRef(0);

  /**
   * Anchor the dive on the real I.
   *
   * The film-window and the fly-past both zoom about the letter I, so where the
   * I actually sits has to be measured, not assumed — its centre drifts with the
   * font size across breakpoints. Written as CSS custom properties the mask and
   * the transforms both read.
   */
  const measure = () => {
    const sec = heroRef.current;
    const el = iRef.current;
    if (!sec || !el) return;
    const r = el.getBoundingClientRect();
    const vw = sec.clientWidth || 1;
    const vh = sec.clientHeight || 1;
    const cx = ((r.left + r.width / 2) / vw) * 100;
    const cy = ((r.top + r.height / 2) / vh) * 100;
    sec.style.setProperty("--ix", cx.toFixed(2) + "%");
    sec.style.setProperty("--iy", cy.toFixed(2) + "%");
    sec.style.setProperty("--mi", "0px");
  };

  // ── The wordmark settles onto the plaster on load. ──
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.fonts?.ready) document.fonts.ready.then(measure);
      measure();

      if (reduce) {
        gsap.set(".hw-line", { opacity: 1, y: 0 });
        gsap.set(".hw-rule", { scaleX: 1 });
        return;
      }
      gsap
        .timeline({ delay: 0.25 })
        .fromTo(
          ".hw-line",
          { opacity: 0, y: 34, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, stagger: 0.16, ease: "power3.out" },
          0
        )
        .fromTo(".hw-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power4.inOut" }, 0.5);
    },
    { scope: heroRef }
  );

  // ── Scroll: the camera dives into the I, the film grows out of it, then scrubs ──
  useGSAP(
    () => {
      const video = videoRef.current;
      const sec = heroRef.current;
      if (!video || !sec) return;

      video.poster = posterFor();
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.pause();

      let primed = false;
      const prime = () => {
        if (primed) return;
        if (video.readyState === 0) video.load();
        const p = video.play();
        if (p) {
          p.then(() => {
            video.pause();
            primed = true;
          }).catch(() => {
            primed = false;
          });
        } else {
          video.pause();
          primed = true;
        }
      };

      const scrub = { t: 0 };
      let lastFrame = -1;
      const applySeek = () => {
        if (video.readyState < 1 || video.seeking) return;
        const d = video.duration;
        if (!Number.isFinite(d) || d <= 0) return;
        const maxFrame = Math.floor(d * VIDEO_FPS) - 1;
        const frame = Math.max(0, Math.min(Math.round(scrub.t * VIDEO_FPS), maxFrame));
        if (frame === lastFrame) return;
        lastFrame = frame;
        video.currentTime = (frame + 0.5) / VIDEO_FPS;
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dive = { v: 0 };
      // How big the I-mask must get for the film to be WHOLE.
      //
      // The mask height is --mi; the glyph is ~0.64x as wide, and its STEM is a
      // quarter of that (0.16 * --mi). It is the stem that has to clear the
      // viewport WIDTH — the serifs are long gone off-screen — so --mi must reach
      // vw / 0.16 = 6.25 * vw before there are no bare edges. Undershoot this and
      // the film ends as a centred band with the page showing down both sides.
      const endMi = () => Math.max(window.innerWidth * 6.25, window.innerHeight) * 1.3;
      const applyDive = () => {
        waveRef.current?.setDive(dive.v);
        const mi = restMi.current + (endMi() - restMi.current) * dive.v;
        sec.style.setProperty("--mi", mi.toFixed(1) + "px");
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => "+=" + window.innerHeight * (isCoarse() ? 2 : 3),
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: measure,
        },
      });

      if (reduce) {
        // Least motion: the plaster and letters simply give way and the film,
        // which is what the scroll is really for, takes over.
        tl.to([creamRef.current, wordRef.current], { opacity: 0, ease: "none", duration: INTRO * 0.7 }, 0)
          .to(dive, { v: 1, ease: "none", duration: INTRO, onUpdate: applyDive }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: INTRO }, 0);
      } else {
        // The camera dives into the I. The film grows out of it (the mask), the
        // white letters over it dissolve so the film shows through the glyph, and
        // the plaster and the other letters rush the camera and fly past — a slow
        // roll on the whole scene reads as the camera moving, not the picture.
        tl.to(creamRef.current, { scale: 2.7, rotate: -3, opacity: 0, ease: "power2.in", duration: INTRO }, 0)
          .to(wordRef.current, { scale: 3.0, rotate: -3, opacity: 0, ease: "power2.in", duration: INTRO * 0.86 }, 0)
          .to(dive, { v: 1, ease: "power2.in", duration: INTRO, onUpdate: applyDive }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: INTRO }, INTRO * 0.4);
      }

      // ── INTRO → 1: the film, scrubbed ──
      tl.to(
        scrub,
        {
          t: () => (Number.isFinite(video.duration) ? video.duration : 0),
          ease: "none",
          duration: reduce ? 1 : 1 - INTRO,
          onUpdate: applySeek,
        },
        reduce ? 0 : INTRO
      );

      const onLoaded = () => {
        prime();
        ScrollTrigger.refresh();
      };
      if (video.readyState >= 1) onLoaded();
      video.addEventListener("loadedmetadata", onLoaded);

      const onGesture = () => prime();
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

      {/* z1 — the living plaster ground, behind everything and flying past on the dive */}
      <div ref={creamRef} className="hero-cream" aria-hidden>
        <WaveCanvas ref={waveRef} className="hero-bg-canvas" />
        <div className="hero-bg-fallback" />
      </div>

      {/* z2 — the film, MASKED to the letter I so only the I shows it. The mask
             (--mi) grows on scroll until the film is the whole screen. */}
      <div className="hero-portal" aria-hidden>
        <div className="absolute inset-0" style={{ ...LQIP_BG, backgroundColor: "#181913" }}>
          <div className="hero-letterbox absolute inset-0" />
          <video
            ref={videoRef}
            autoPlay={false}
            muted
            playsInline
            controls={false}
            preload="auto"
            className="hero-video cine-breath"
            style={{ willChange: "transform" }}
          >
            {SOURCES.map((s) => (
              <source key={s.src} src={s.src} type={s.type} media={s.media} />
            ))}
          </video>
        </div>
        <div className="cine-vignette" aria-hidden />
        <div ref={grainRef} className="cine-grain" style={{ opacity: 0 }} aria-hidden />
      </div>

      {/* Nav legibility — over cream at the top, over the film after the dive. */}
      <div className="hero-topscrim" aria-hidden />

      {/* z3 — the white letters. At rest the I is a clean glyph over the portal;
             on the dive it dissolves and the film shows through it. */}
      <div ref={wordRef} className="hero-word" aria-hidden>
        <span className="hw-line hw-anima">
          AN<i ref={iRef} className="hw-i">I</i>MA
        </span>
        <span className="hw-sub">
          <span className="hw-rule" />
          <span className="hw-line hw-res">RESIDENCES</span>
          <span className="hw-rule" />
        </span>
      </div>
    </section>
  );
}
